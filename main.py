from dotenv import load_dotenv
import os
import httpx
import html
from openai import OpenAI
import requests
from fastapi import Request, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cohere
from fastapi import Body
from fastapi import Request
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
import tempfile
import urllib.parse
from google.cloud import translate_v2 as google_translate


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    content: str
    style: str = "default"
    offset: int = 0

class StyleChangeRequest(BaseModel):
    text: str
    style: str


MISTRAL_API_KEY_H = os.getenv("MISTRAL_API_KEY_H")
MISTRAL_API_KEY_S = os.getenv("MISTRAL_API_KEY_S")
AGENT_ID_SUMMARY = os.getenv("MISTRAL_AGENT_ID_SUMMARY")
AGENT_ID_REWRITE = os.getenv("MISTRAL_AGENT_ID_REWRITE")
AGENT_ID_GRAMMAR = os.getenv("MISTRAL_AGENT_ID_GRAMMAR")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)
PAPAGO_CLIENT_ID = os.getenv("PAPAGO_CLIENT_ID")
PAPAGO_CLIENT_SECRET = os.getenv("PAPAGO_CLIENT_SECRET")

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "./translate-key.json"

@app.post("/searchExample")
async def search_example(data: TextInput):
    count = 5  # 고정
    prompt = f"""
    '{data.content}'이라는 표현을 다양한 문맥과 상황 속에서 자연스럽게 사용하는 예문을 {count}개 만들어줘.
    {'앞에서 제공된 예문과 겹치지 않게' if data.offset > 0 else ''}
    각 예문은 문맥이 풍부해야 하며, 문장 길이는 30자에서 100자 사이로 다양하게 작성해줘.
    모든 예문은 번호를 매기고, 번호별로 줄바꿈해서 구분해줘.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "너는 국어 예문 생성 도우미야."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        output = response.choices[0].message.content
        return {"examples": output}
    except Exception as e:
        return {"error": f"GPT 호출 오류: {str(e)}"}


@app.post("/gptStyleChange")
async def gpt_style_change(request: Request):
    body = await request.json()

    text = body.get('text')
    style = body.get('style')

    if not text or not style:
        print("❗ text나 style이 비어있음")
        return {"error": "text 또는 style이 비어있습니다"}

    style = style.lower()

    style_instructions = {
        "formal": "문장을 격식 있고 정중하게 바꿔줘.",
        "casual": "문장을 친근하고 일상적인 말투로 바꿔줘.",
        "literary": "문장을 문학적으로 품격 있게 다시 써줘.",
        "academic": "문장을 전문적이고 학술적인 표현으로 바꿔줘."
    }

    instruction = style_instructions.get(style)

    if instruction is None:
        print(f"❗ 지원하지 않는 스타일: {style}")
        return {"error": f"지원하지 않는 스타일입니다. (서버가 받은 style: {style})"}

    full_prompt = f"아래 문장을 {instruction}\n\n'{text}'"

    try:
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "너는 문체를 변환하는 전문 AI 어시스턴트야. 문체 변경시 비속어는 사용하지 마."},
                {"role": "user", "content": full_prompt}
            ],
            temperature=0.7
        )
        output = completion.choices[0].message.content
        return {"styled_text": output}
    except Exception as e:
        return {"error": f"GPT 호출 오류: {str(e)}"}

@app.post("/mistralRewrite")
async def mistral_rewrite(content: TextInput):
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY_H}",
        "Content-Type": "application/json"
    }
    payload = {
        "agent_id": AGENT_ID_REWRITE,
        "messages": [
            {"role": "user", "content": content.content}
        ]
    }

    response = requests.post(
        "https://api.mistral.ai/v1/agents/completions",
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        return {"error": f"HTTP 오류: {response.status_code}", "detail": response.text}

    result = response.json()
    # print("Mistral 응답:", result)

    try:
        message = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        return {"error": "응답 파싱 오류", "detail": str(e), "raw_response": result}

    return {"result": message}

@app.post("/summary")
async def summarize(content: TextInput):
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY_H}",
        "Content-Type": "application/json"
    }
    payload = {
        "agent_id": AGENT_ID_SUMMARY,
        "messages": [
            {"role": "user", "content": f"다음 글을 최대한 간결하게 요약해줘. 대신 핵심내용은 포함해줘:\n\n{content.content}"}
        ]
    }
    response = requests.post(
        "https://api.mistral.ai/v1/agents/completions", headers=headers, json=payload)
    result = response.json()
    try:
        message = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return {"error": "Mistral 요약 오류"}
    return {"result": message}

@app.post("/expand")
async def expand(content: TextInput):
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "당신은 글을 확장하는 전문가입니다."},
            {"role": "user", "content": f"다음 글을 더 자세히 확장해줘:\n\n{content.content}"}
        ]
    )
    message = response.choices[0].message.content
    return {"result": message}

@app.post("/mistralGrammar")
async def mistral_grammar(content: TextInput):
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY_S}",
        "Content-Type": "application/json"
    }
    payload = {
        "agent_id": AGENT_ID_GRAMMAR,
        "messages": [
            {"role": "user", "content": content.content}
        ]
    }

    response = requests.post(
        "https://api.mistral.ai/v1/agents/completions",
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        return {"error": f"HTTP 오류: {response.status_code}", "detail": response.text}

    result = response.json()
    # print("Mistral 응답:", result)

    try:
        message = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        return {"error": "응답 파싱 오류", "detail": str(e), "raw_response": result}

    return {"result": message}


@app.post("/cohereHonorific")
async def cohere_honorific(content: TextInput):
    co = cohere.ClientV2(COHERE_API_KEY)  # API 키

    user_prompt = f"{content.content}\n\n이 글에서 ~습니다. 처럼 높임말로 바꿔줘. 그리고 결과는 딱 글만 나오게 해줘."

    response = co.chat(
        model="command-a-03-2025",
        messages=[{"role": "user", "content": user_prompt}]
    )

    # 메시지에서 텍스트만 추출
    full_text = response.message.content[0].text

    return {"result": full_text}

@app.post("/cohereInformal")
async def cohere_honorific(content: TextInput):
    co = cohere.ClientV2(COHERE_API_KEY)  # API 키

    user_prompt = f"{content.content}\n\n이 글에서 ~했어. 처럼 반말체로 바꿔줘. 그리고 결과는 딱 글만 나오게 해줘."

    response = co.chat(
        model="command-a-03-2025",
        messages=[{"role": "user", "content": user_prompt}]
    )

    # 메시지에서 텍스트만 추출
    full_text = response.message.content[0].text

    return {"result": full_text}

@app.post("/translate")
async def translate_text(request: Request):
    body = await request.json()
    text = body.get("text")
    source = body.get("source", "None")
    target = body.get("target", "en")

    try:
        client = google_translate.Client()

        if source and source != "auto":
            result = client.translate(
                text, source_language=source, target_language=target)
        else:

            result = client.translate(text, target_language=target)

        translated_clean = html.unescape(result["translatedText"])
        return {"result": translated_clean}

    except Exception as e:
        return {"error": f"Google 번역 API 호출 오류: {str(e)}"}


@app.post("/pdfScan")
async def upload_pdf(pdf: UploadFile = File(...)):
    # 업로드된 PDF를 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        contents = await pdf.read()
        temp_pdf.write(contents)
        temp_pdf_path = temp_pdf.name

    # PDF 파일에서 텍스트 추출
    try:
        reader = PdfReader(temp_pdf_path)
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() or ""
    except Exception as e:
        return {"error": f"PDF 처리 중 오류 발생: {str(e)}"}

    return {"filename": pdf.filename, "text": extracted_text.strip()}
