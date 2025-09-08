from dotenv import load_dotenv
import io
import os
import re
import json
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
from fastapi.responses import JSONResponse
from google.cloud import vision
import base64
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
import tempfile
from google.oauth2 import service_account
from google.cloud import translate_v2 as google_translate
from google.cloud import vision
import html
import re
import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer
import time


load_dotenv()

app = FastAPI()

os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)
os.environ.pop("VISION_KEY_PATH", None)


allow_origins=[
  "https://hj-sp.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hj-sp.github.io"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.get("/whoami")
def whoami():
   
    return {
        "ok": True,
        "has_json_vision": bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")),
        "has_json_translate": bool(os.environ.get("GOOGLE_CREDENTIALS_JSON")),
        "has_path_var": bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")),
        "routes": [r.path for r in app.routes], 
    }

@app.get("/cors-test")
def cors_test():
    return {"ok": True}


# ---- Vision (GOOGLE_APPLICATION_CREDENTIALS_JSON) ----
try:
    _vision_info = json.loads(os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"])
    _vision_creds = service_account.Credentials.from_service_account_info(_vision_info)
    vision_client = vision.ImageAnnotatorClient(credentials=_vision_creds)
except Exception as e:
    # 초기화 실패 시 디버그 로그
    print("[Vision Init Error]", e)
    vision_client = None

# ---- Translate (GOOGLE_CREDENTIALS_JSON) ----
try:
    _trans_info = json.loads(os.environ["GOOGLE_CREDENTIALS_JSON"])
    _trans_creds = service_account.Credentials.from_service_account_info(_trans_info)
    translate_client = google_translate.Client(credentials=_trans_creds)
except Exception as e:
    print("[Translate Init Error]", e)
    translate_client = None

class TextInput(BaseModel):
    content: str
    style: str = "default"
    offset: int = 0
    source: str = "rewrite"

class StyleChangeRequest(BaseModel):
    text: str
    style: str


MISTRAL_API_KEY_H = os.getenv("MISTRAL_API_KEY_H")
MISTRAL_API_KEY_S = os.getenv("MISTRAL_API_KEY_S")
AGENT_ID_SUMMARY = os.getenv("MISTRAL_AGENT_ID_SUMMARY")
AGENT_ID_REWRITE = os.getenv("MISTRAL_AGENT_ID_REWRITE")
AGENT_ID_GRAMMAR = os.getenv("MISTRAL_AGENT_ID_GRAMMAR")
AGENT_ID_GRAMMAR2 = os.getenv("MISTRAL_AGENT_ID_GRAMMAR2")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)
PAPAGO_CLIENT_ID = os.getenv("PAPAGO_CLIENT_ID")
PAPAGO_CLIENT_SECRET = os.getenv("PAPAGO_CLIENT_SECRET")


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
        return {"result": output}
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
                {"role": "system",
                    "content": "너는 문체를 변환하는 전문 AI 어시스턴트야. 문체 변경시 비속어는 사용하지 마."},
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
    count = 1

    prompt = f"""너는 창의적이고 유연한 글쓰기 첨삭 도우미야. 아래 글을 바탕으로 리라이팅한 **예시문을 반드시 하나만** 작성해 줘. 다음 지침을 반드시 따라야 해:

1. 문체와 의미는 유지하되,  
2. 문장 구조(예: 어순, 구문 유형, 능동/수동, 문장 길이)를 다양하게 바꾸고,  
3. 단어 선택과 어휘 스타일(예: 묘사 중심, 감정 강조, 간결체, 문어체 등)을 매번 다르게 써줘.

출력 형식은 다음과 같아:

예시문:
(여기에 리라이팅된 문장)

아무 설명 없이 예시문 하나만 보여줘.
원문: {content.content}
"""

    payload = {
        "agent_id": AGENT_ID_REWRITE,
        "messages": [
            {"role": "user", "content": prompt}
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
    start_time = time.perf_counter()  # 처리 시작 시점
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

    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    print(f"[총 처리 시간] {elapsed_time:.2f}초")

    return {"result": message}


# @app.post("/mistralGrammar2")
# async def mistral_grammar2(content: TextInput):
#     start_time = time.perf_counter()  # 처리 시작 시점
#     # 문장 분리 (마침표, 느낌표, 물음표 등으로 분리)
#     sentences = split_sentences(content.content)
#     n = len(sentences)  # 문장 개수(배열 행 개수)
#     print(n)

#     # 앞뒤 공백 제거
#     sentences = [s.strip() for s in sentences if s.strip()]

#     # n행 3열 배열 생성: 첫 열에 문장, 나머지 두 열은 빈 문자열 (원문, 교정문, 미스트랄 결과)
#     array = [[sentence, "", ""] for sentence in sentences]
#     for row in array:
#         print(row)

#     # T5 모델 로드
#     model = T5ForConditionalGeneration.from_pretrained(
#         "j5ng/et5-typos-corrector")
#     tokenizer = T5Tokenizer.from_pretrained("j5ng/et5-typos-corrector")

#     device = "cuda:0" if torch.cuda.is_available() else "cpu"

#     model = model.to(device)

#     for i in range(n):
#         # 예시 입력 문장
#         input_text = array[i][0]

#         # 입력 문장 인코딩
#         input_encoding = tokenizer(
#             "맞춤법을 고쳐주세요: " + input_text, return_tensors="pt")

#         input_ids = input_encoding.input_ids.to(device)
#         attention_mask = input_encoding.attention_mask.to(device)

#         # T5 모델 출력 생성
#         output_encoding = model.generate(
#             input_ids=input_ids,
#             attention_mask=attention_mask,
#             max_length=128,
#             num_beams=5,
#             early_stopping=True,
#         )

#         # 출력 문장 디코딩
#         output_text = tokenizer.decode(
#             output_encoding[0], skip_special_tokens=True)

#         array[i][1] = output_text

#     # 역순으로 인덱스를 돌면서 맞춤법이 틀린 게 없는 문장 삭제
#     for i in reversed(range(len(array))):
#         if array[i][0] == array[i][1]:
#             del array[i]

#     for row in array:
#         print(row)

#     for i in range(len(array)):
#         mistral_input_text = f"1. {array[i][0]}\n2. {array[i][1]}"

#         headers = {
#             "Authorization": f"Bearer {MISTRAL_API_KEY_S}",
#             "Content-Type": "application/json"
#         }
#         payload = {
#             "agent_id": AGENT_ID_GRAMMAR2,
#             "messages": [
#                 {"role": "user", "content": mistral_input_text}
#             ]
#         }
#         response = requests.post(
#             "https://api.mistral.ai/v1/agents/completions",
#             headers=headers,
#             json=payload
#         )

#         if response.status_code != 200:
#             return {"error": f"HTTP 오류: {response.status_code}", "detail": response.text}

#         result = response.json()

#         try:
#             message = result["choices"][0]["message"]["content"]
#             array[i][2] = message  # 응답 결과
#             print(array[i][2])
#         except (KeyError, IndexError) as e:
#             return {"error": "응답 파싱 오류", "detail": str(e), "raw_response": result}

#     end_time = time.perf_counter()
#     elapsed_time = end_time - start_time
#     print(f"[총 처리 시간] {elapsed_time:.2f}초")

#     return {"result": array, "arrayLen": len(array)}

def split_sentences(text):
    text = text.strip()
    if not text:
        return []

    # 문장 끝 구두점이 하나라도 포함돼 있다면 그 기준으로 분리
    if re.search(r'[.!?]', text):
        # 마침표/느낌표/물음표 기준으로 문장 분리 (캡처 그룹으로 포함시켜서 문장 구두점도 살림)
        parts = re.split(r'([.!?])', text)
        sentences = []
        for i in range(0, len(parts) - 1, 2):
            sentence = parts[i].strip() + parts[i + 1]  # 문장 + 구두점
            if sentence.strip():
                sentences.append(sentence.strip())
        return sentences
    else:
        # 마침표/느낌표/물음표 없으면 한 문장으로 간주
        return [text]

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

    if not text:
        return {"error": "No text provided"}

    if translate_client is None:
        return {"error": "Translate client not initialized. Check GOOGLE_CREDENTIALS_JSON."}

    try:
        if source and source != "auto":
            result = translate_client.translate(
                text, source_language=source, target_language=target
            )
        else:
            result = translate_client.translate(text, target_language=target)

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

    # 온점 앞의 띄어쓰기 제거
    cleaned_text = re.sub(r" (?=\.)", "", extracted_text)

    return {"filename": pdf.filename, "text": cleaned_text.strip()}

# 단독 자모 제거(후처리)
def clean_ocr_text(text: str) -> str:
    """
    단독 자모(ㅏ, ㄱ 등)나 잡음을 제거함.
    """
    cleaned_lines = []
    for line in text.split('\n'):
        stripped = line.strip()
        # 단독 자모나 1~2글자 잡음 제거
        if re.fullmatch(r'[ㄱ-ㅎㅏ-ㅣ\s]*', stripped):
            continue
        if len(stripped) <= 2 and re.search(r'[ㄱ-ㅎㅏ-ㅣ]', stripped):
            continue
        cleaned_lines.append(line)
    return '\n'.join(cleaned_lines)


@app.post("/visionOCR")
async def vision_ocr(image: UploadFile = File(...)):
    try:
        if vision_client is None:
            return {"result": "Vision client not initialized. Check GOOGLE_APPLICATION_CREDENTIALS_JSON."}

        contents = await image.read()
        image_content = vision.Image(content=contents)
        response = vision_client.text_detection(image=image_content)

        texts = response.text_annotations
        if not texts:
            return {"result": "텍스트를 찾을 수 없습니다."}

        raw_text = texts[0].description
        cleaned_text = clean_ocr_text(raw_text)
        return {"result": cleaned_text}
    except Exception as e:
        print("❌ 서버 에러:", e)
        return {"result": f"서버 에러: {e}"}