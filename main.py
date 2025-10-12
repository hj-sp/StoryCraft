from dotenv import load_dotenv
<<<<<<< HEAD
import io
=======
>>>>>>> 941529f (Initial commit)
import os
import re
import json
import html
from openai import OpenAI
import requests
<<<<<<< HEAD
from fastapi import Request, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
=======
from fastapi import Request, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
>>>>>>> 941529f (Initial commit)
import cohere
from fastapi import Body
from fastapi import Request
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from google.cloud import vision
<<<<<<< HEAD
import base64
=======
>>>>>>> 941529f (Initial commit)
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
import tempfile
from google.oauth2 import service_account
from google.cloud import translate_v2 as google_translate
from google.cloud import vision
import html
<<<<<<< HEAD
import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer
import time
import pathlib
import subprocess
import mimetypes
import zipfile
import xml.etree.ElementTree as ET
#import speech_recognition as sr  # 음성인식
=======
import time
import pathlib
import subprocess
import zipfile
import xml.etree.ElementTree as ET
import speech_recognition as sr  # 음성인식
>>>>>>> 941529f (Initial commit)
from pydub import AudioSegment
from io import BytesIO
import imageio_ffmpeg
from hanspell import spell_checker
<<<<<<< HEAD
=======
from typing import Optional

def _expand_clamp(v, lo, hi):
    try:
        v = int(v)
    except Exception:
        v = lo
    return max(lo, min(v, hi))

def _expand_split_sentences_kor(text: str):
    """한글 문장 경계 대충 잘라내는 경량 분리기(마침표/요/니다/… 기준)."""
    t = re.sub(r'\s*\n+\s*', '\n', (text or '').strip())
    s = re.sub(r'([\.!?…])\s+', r'\1\n', t)
    s = re.sub(r'(다\.|요\.|니다\.)\s+', r'\1\n', s)
    parts = [p.strip() for p in s.split('\n') if p.strip()]
    return parts

def _expand_ends_with_terminal(s: str) -> bool:
    return bool(re.search(r'(다\.|요\.|니다\.)\s*$|[.!?…]\s*$|[”’"\')\]】〉》」』]\s*$', s or ''))

def _expand_crop_to_last_boundary(s: str) -> str:
    """마지막 문장 경계(마침표/따옴표 등)에서 컷."""
    if not s:
        return s
    m = list(re.finditer(r'(다\.|요\.|니다\.)|[.!?…]|[”’"\')\]】〉》」』]', s))
    return s if not m else s[:m[-1].end()]

def _expand_smart_trim_to_chars(text: str, max_chars: int) -> str:
    """문장 경계 유지하며 글자 상한에 맞춤. 실패 시 하드 컷."""
    if len(text) <= max_chars:
        return text
    parts = _expand_split_sentences_kor(text)
    out, total = [], 0
    for p in parts:
        if not _expand_ends_with_terminal(p):
            continue
        add = len(p) + (1 if out else 0)
        if total + add > max_chars:
            break
        out.append(p)
        total += add
    return ("\n".join(out).rstrip() if out else text[:max_chars].rstrip())

def _expand_est_tokens_for_chars(chars: int) -> int:
    """대략적인 토큰 예산(한글 기준 여유있게)."""
    return max(128, int(chars / 1.6) + 96)

def _expand_llm(client, messages, max_chars: int, temperature=0.35):
    """Chat Completions 래퍼: max_tokens를 글자수 기반으로 안전 설정."""
    max_tokens = _expand_est_tokens_for_chars(max_chars)
    resp = client.chat.completions.create(
        model="gpt-4",                 # ← 필요시 사용 중인 모델명으로 통일
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    choice = resp.choices[0]
    # 일부 SDK에서 finish_reason 접근 방법이 달라질 수 있으므로 getattr 사용
    finish = getattr(choice, "finish_reason",
                     getattr(choice, "finish_reason", None))
    text = (choice.message.content or "").strip()
    return text, finish

def _expand_count_sents(s: str) -> int:
    return len(_expand_split_sentences_kor(s or ""))


class InformalInput(BaseModel):
    content: str
    ending: Optional[str] = None  # 'hada' | 'haetda' | 'hae'

class ExpandInput(BaseModel):
    content: str
    length_boost: int = 20
    length_level: Optional[str] = None
    add_sentences: int = 0

    class Config:
        extra = "ignore"

def _clamp(v, lo, hi):
    return max(lo, min(v, hi))

def _split_sentences_kor(text: str):
    """한국어/영문 혼용 간단 분리: 마침표류/종결형 + 개행 기준."""
    text = re.sub(r'\s*\n+\s*', '\n', text.strip())
    s = re.sub(r'([\.!?…])\s+', r'\1\n', text)
    s = re.sub(r'(다\.|요\.|니다\.)\s+', r'\1\n', s)
    return [p.strip() for p in s.split('\n') if p.strip()]

def _smart_trim_to_chars(text: str, max_chars: int) -> str:
    """문장 단위로 합치면서 상한 이하로 유지(불완전 마지막 문장은 버림)."""
    if len(text) <= max_chars:
        return text
    parts = _split_sentences_kor(text)
    out, total = [], 0
    for p in parts:
        # 완결 문장만 추가
        if not _ends_with_terminal(p):
            continue
        if total + len(p) + (1 if out else 0) > max_chars:
            break
        out.append(p)
        total += len(p) + (1 if out else 0)
    # 여전히 비면 하드컷
    return ("\n".join(out).rstrip() if out else text[:max_chars].rstrip())

def _ends_with_terminal(s: str) -> bool:
    """문장 완결 판단(한국어 종결/문장부호/닫힘문자)."""
    return bool(re.search(r'(다\.|요\.|니다\.)\s*$|[.!?…]\s*$|[”’"\')\]】〉》」』]\s*$', s))

def _crop_to_last_boundary(s: str) -> str:
    """마지막 문장 경계까지만 남김."""
    m = list(re.finditer(r'(다\.|요\.|니다\.)|[.!?…]|[”’"\')\]】〉》」』]', s))
    return s if not m else s[:m[-1].end()]

>>>>>>> 941529f (Initial commit)

load_dotenv()

app = FastAPI()

os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)
os.environ.pop("VISION_KEY_PATH", None)

ALLOW_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://hj-sp.github.io",
    "https://crystal-0109.github.io",
<<<<<<< HEAD
=======
    "https://storycraft-cnjn.onrender.com",
>>>>>>> 941529f (Initial commit)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
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
    _vision_info = json.loads(
        os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"])
    _vision_creds = service_account.Credentials.from_service_account_info(
        _vision_info)
    vision_client = vision.ImageAnnotatorClient(credentials=_vision_creds)
except Exception as e:
    # 초기화 실패 시 디버그 로그
    print("[Vision Init Error]", e)
    vision_client = None

# ---- Translate (GOOGLE_CREDENTIALS_JSON) ----
try:
    _trans_info = json.loads(os.environ["GOOGLE_CREDENTIALS_JSON"])
    _trans_creds = service_account.Credentials.from_service_account_info(
        _trans_info)
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


AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()  # 패키지 내부 ffmpeg 사용

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
<<<<<<< HEAD
=======
        print(output)

        # 글 앞 뒤 따옴표 제거
        output = output[1:-1] if len(
            output) >= 2 and output[0] == output[-1] and output[0] in ('"', "'") else output
        print(output)

>>>>>>> 941529f (Initial commit)
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
<<<<<<< HEAD
    # print("Mistral 응답:", result)
=======
>>>>>>> 941529f (Initial commit)

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
<<<<<<< HEAD
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
=======
async def expand(payload: ExpandInput):
    try:
        text = (payload.content or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="content is empty")

        level_map = {'low': 20, 'medium': 50, 'high': 80, 'xhigh': 100}
        if payload.length_level:
            boost_in = level_map.get(payload.length_level.lower(), 50)
        else:
            boost_in = int(payload.length_boost or 20)

        allowed = [20, 50, 70, 80, 100]
        boost = boost_in if boost_in in allowed else min(
            allowed, key=lambda x: abs(x - boost_in))

        orig_chars = len(text)
        orig_sents = _expand_count_sents(text)
        short_input = (orig_chars < 120) or (orig_sents <= 2)

        target_chars = int(orig_chars * (1 + boost / 100.0))
        min_chars = int(orig_chars * (1 + (boost / 100.0) * 0.95))
        max_chars = int(orig_chars * (1 + boost / 100.0 + 0.08))

        if short_input:

            floor_min = orig_chars + (120 if boost >= 70 else 80)
            floor_target = floor_min + 60
            floor_max = floor_target + 160
            min_chars = max(min_chars, floor_min)
            target_chars = max(target_chars, floor_target)
            max_chars = max(max_chars, floor_max)

        add_n = _expand_clamp(payload.add_sentences or 0, 0, 50)

        if short_input and add_n == 0:
            add_n = 2 if boost >= 70 else 1

        if add_n > 0:
            extra_chars = add_n * 70
            min_chars = max(min_chars, int(orig_chars + extra_chars * 0.8))
            target_chars = max(target_chars, min_chars + 60)
            max_chars = max(max_chars, int(orig_chars + extra_chars * 1.4))

        if min_chars > max_chars:
            max_chars = min_chars + 120
        if target_chars > max_chars:
            target_chars = max(min_chars, max_chars - 60)

        system_msg = "당신은 한국어 글을 자연스럽고 명확하게 확장하는 전문가입니다."
        guide = [
            "원문 의미를 유지하고 전개를 매끄럽게 확장하라.",
            "단순한 바꿔쓰기(패러프레이즈)만 하지 말고, 새로운 설명/이유/예시/전환을 덧붙여라.",
            f"최소 {min_chars}자 이상, 최대 {max_chars}자 이하를 엄수하라.",
            f"목표 길이: 약 {target_chars}자.",
            "불필요한 도입/결론/중복 요약을 피하라.",
            "모든 문장은 완결형(…다./…요./…입니다.)으로 끝내라.",
        ]
        if add_n > 0:
            guide.append(f"원문 내용은 유지하되, **최소 {add_n}문장**을 새로 추가하라.")

        user_prompt = f"[원문]\n{text}\n\n[지시]\n- " + "\n- ".join(guide)

        out, finish = _expand_llm(
            client,
            [{"role": "system", "content": system_msg},
             {"role": "user", "content": user_prompt}],
            max_chars=max_chars,
            temperature=0.35
        )

        if len(out) > max_chars:
            out = _expand_smart_trim_to_chars(out, max_chars)

        if not _expand_ends_with_terminal(out) or finish == "length":
            remain = max(0, max_chars - len(out))
            if remain > 24:
                tail_ctx = out[-500:] if len(out) > 500 else out
                tail_prompt = (
                    f"{tail_ctx}\n\n"
                    "위 글의 마지막을 자연스럽게 끝맺으세요.\n"
                    "- 한 문장만 출력\n"
                    "- 새로운 주장/예시 추가 금지, 앞 맥락만 완결\n"
                    f"- 최대 길이 {min(140, remain)}자\n"
                    "- 완결형 종결어미로 끝내세요(…다./…요./…입니다.)."
                )
                tail, _ = _expand_llm(
                    client,
                    [{"role": "system", "content": "간결한 문장 마무리 도우미"},
                     {"role": "user", "content": tail_prompt}],
                    max_chars=min(140, remain),
                    temperature=0.2
                )
                if tail:
                    sep = "" if out.endswith((" ", "\n")) else " "
                    out = (out + sep + tail).strip()
            if len(out) > max_chars:
                out = _expand_smart_trim_to_chars(out, max_chars)

        tries = 0
        while len(out) < min_chars and tries < 2:
            need_chars = max(120, min(min_chars - len(out),
                             int((min_chars - len(out)) * 1.2)))
            add_guide = [
                "기존 문장은 바꾸지 말고, '추가 문장/문단'만 이어서 작성하라.",
                f"현재 길이: {len(out)}자, 목표 최소: {min_chars}자 → 대략 {need_chars}자 보강.",
                "중복 요약·도입/결론 재작성 금지.",
                "완결형 종결어미로 끝내라."
            ]
            cont_prompt = (
                f"[지금까지의 초안]\n{out}\n\n"
                "[지시]\n- " + "\n- ".join(add_guide) + "\n"
                "※ 출력은 '추가되는 내용만' 반환하세요."
            )
            remain_budget = max_chars - len(out)
            if remain_budget <= 60:
                break
            add_text, _ = _expand_llm(
                client,
                [{"role": "system", "content": "확장 보강 도우미"},
                 {"role": "user", "content": cont_prompt}],
                max_chars=min(remain_budget, max(220, need_chars + 140)),
                temperature=0.35
            )
            add_text = (add_text or "").strip()
            if len(add_text) > remain_budget:
                add_text = _expand_smart_trim_to_chars(add_text, remain_budget)
            if add_text:
                sep = "\n\n" if not out.endswith("\n") else "\n"
                out = (out + sep + add_text).strip()
            if len(out) > max_chars:
                out = _expand_smart_trim_to_chars(out, max_chars)
            if not _expand_ends_with_terminal(out):
                out = _expand_crop_to_last_boundary(out)
            tries += 1

        if add_n > 0:
            needed = (orig_sents + add_n) - _expand_count_sents(out)
            s_tries = 0
            while needed > 0 and s_tries < 2:
                remain_budget = max_chars - len(out)
                if remain_budget <= 60:
                    break
                cont_prompt = (
                    f"[지금까지의 초안]\n{out}\n\n"
                    f"위 글의 맥락을 유지하며 **새로운 문장 {needed}개**만 추가로 작성하라.\n"
                    "- 기존 문장은 수정하지 말고 '이어 쓰기'\n"
                    "- 각 문장은 완결형(…다./…요./…입니다.)으로 끝내기\n"
                    "- 도입/결론/요약 금지, 중복 금지\n"
                    "- 출력은 '추가되는 문장만' 반환"
                )
                add_text, _ = _expand_llm(
                    client,
                    [{"role": "system", "content": "확장 보강(문장만) 도우미"},
                     {"role": "user", "content": cont_prompt}],
                    max_chars=min(remain_budget, 420 + needed * 100),
                    temperature=0.35
                )
                add_text = (add_text or "").strip()
                if add_text:
                    sep = "\n\n" if not out.endswith("\n") else "\n"
                    out = (out + sep + add_text).strip()
                    if len(out) > max_chars:
                        out = _expand_smart_trim_to_chars(out, max_chars)
                needed -= _expand_count_sents(add_text)
                s_tries += 1

        if len(out) > max_chars:
            out = _expand_smart_trim_to_chars(out, max_chars)

        return {
            "result": out,
            "meta": {
                "orig_chars": orig_chars,
                "min_chars": min_chars,
                "max_chars": max_chars,
                "target_chars": target_chars,
                "requested_add_sentences": add_n,
                "final_chars": len(out),
                "final_sents": _expand_count_sents(out),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"/expand failed: {type(e).__name__}: {str(e)}"}
        )

>>>>>>> 941529f (Initial commit)

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

<<<<<<< HEAD
@app.post("/cohereHonorific")
async def cohere_honorific(content: TextInput):
    co = cohere.ClientV2(COHERE_API_KEY)  # API 키

    user_prompt = f"{content.content}\n\n이 글에서 ~습니다. 처럼 높임말로 바꿔줘. 그리고 결과는 딱 글만 나오게 해줘."

=======
# 기존
# @app.post("/cohereHonorific")
# async def cohere_honorific(content: TextInput):
#     co = cohere.ClientV2(COHERE_API_KEY)
#     user_prompt = f"{content.content}\n\n이 글에서 ~습니다. 처럼 높임말로 바꿔줘. 그리고 결과는 딱 글만 나오게 해줘."
#     response = co.chat(
#         model="command-a-03-2025",
#         messages=[{"role": "user", "content": user_prompt}]
#     )
#     full_text = response.message.content[0].text
#     return {"result": full_text}


@app.post("/cohereHonorific")
async def cohere_honorific(request: Request):
    body = await request.json()
    text = (body.get("content") or body.get("text") or "").strip()
    level = (body.get("level") or "hamnida").lower()
    if level not in ("haeyo", "hamnida"):
        level = "hamnida"

    if not text:
        return {"error": "content(text)가 비어있습니다."}

    style_map = {
        "haeyo": "문장을 정중하지만 덜 격식 있는 ‘해요체(~요)’로 자연스럽게 바꿔줘.",
        "hamnida": "문장을 공식/문어체의 ‘합니다체(~습니다/~입니다)’로 자연스럽게 바꿔줘.",
    }
    instruction = style_map.get(level, style_map["hamnida"])

    user_prompt = (
        f"{text}\n\n"
        f"{instruction}\n"
        f"출력은 변환된 본문만, 설명/따옴표/머리말 없이 그대로 내보내."
    )

    co = cohere.ClientV2(COHERE_API_KEY)
>>>>>>> 941529f (Initial commit)
    response = co.chat(
        model="command-a-03-2025",
        messages=[{"role": "user", "content": user_prompt}]
    )
<<<<<<< HEAD

    # 메시지에서 텍스트만 추출
    full_text = response.message.content[0].text

    return {"result": full_text}

@app.post("/cohereInformal")
async def cohere_honorific(content: TextInput):
    co = cohere.ClientV2(COHERE_API_KEY)  # API 키

    user_prompt = f"{content.content}\n\n이 글에서 ~했어. 처럼 반말체로 바꿔줘. 그리고 결과는 딱 글만 나오게 해줘."
=======
    out = response.message.content[0].text
    return {"result": out, "level": level}

@app.post("/cohereInformal")
async def cohere_informal(payload: InformalInput):
    co = cohere.ClientV2(COHERE_API_KEY)

    # 'hada' | 'haetda' | 'hae' | ''
    ending = (payload.ending or "").strip().lower()

    ending_rules = {
        "hada": (
            "모든 문장을 '~다'로 끝나는 평서형(…한다/…이다)으로 써줘. "
            "구어체/해요체/존칭 표현은 쓰지 말 것."
        ),
        "haetda": (
            "모든 문장을 과거 평서형 '~했다/~였다'로 써줘. "
            "구어체/해요체/존칭 표현은 쓰지 말 것."
        ),
        "hae": (
            "모든 문장을 '~해/~했어' 반말체로 써줘."
        ),
    }
    # 파라미터가 없으면 기존 동작(반말 '~해/~했어')을 그대로 유지
    instruction = ending_rules.get(ending) or ending_rules["hae"]

    user_prompt = f"""{payload.content}

{instruction}
추가 규칙:
- 결과는 텍스트만 반환(설명/머리말/따옴표 금지).
"""
>>>>>>> 941529f (Initial commit)

    response = co.chat(
        model="command-a-03-2025",
        messages=[{"role": "user", "content": user_prompt}]
    )
<<<<<<< HEAD

    # 메시지에서 텍스트만 추출
    full_text = response.message.content[0].text

    return {"result": full_text}

=======
    full_text = response.message.content[0].text
    return {"result": full_text}


>>>>>>> 941529f (Initial commit)
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

def extract_pdf_text(pdf_path: str) -> str:
    """
    PyPDF2로 PDF의 전체 텍스트를 추출하고, 온점 앞 공백 제거 등 간단 후처리.
    """
    try:
        reader = PdfReader(pdf_path)
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() or ""
        # 온점 앞의 띄어쓰기 제거
        cleaned_text = re.sub(r" (?=\.)", "", extracted_text)
        return cleaned_text.strip()
    except Exception as e:
        raise RuntimeError(f"PDF 처리 중 오류: {e}")


def libreoffice_to_pdf(input_path: str) -> str:
    """
    LibreOffice(headless)로 거의 모든 오피스/HWP 포맷을 PDF로 변환.
    예: soffice --headless --convert-to pdf --outdir /tmp input.hwp
    """
    outdir = tempfile.gettempdir()

    cmd = ["soffice", "--headless", "--convert-to",
           "pdf", "--outdir", outdir, input_path]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE)
        stem = pathlib.Path(input_path).stem
        out_pdf = os.path.join(outdir, f"{stem}.pdf")
        if not os.path.exists(out_pdf):
            raise RuntimeError("LibreOffice 변환 결과 PDF를 찾을 수 없습니다.")
        return out_pdf
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"LibreOffice 변환 실패: {e.stderr.decode('utf-8', errors='ignore')}")

def extract_hwpx_text(local_path: str) -> str:
    """
    HWPX는 OOXML 유사 구조의 '압축(zip)+XML' 포맷.
    Contents/*.xml 에서 모든 텍스트 노드({*}t)를 긁어와 문단 단위로 합칩니다.
    """
    texts = []
    with zipfile.ZipFile(local_path, "r") as zf:

        xml_names = [n for n in zf.namelist()
                     if n.lower().startswith("contents/") and n.lower().endswith(".xml")]
        if not xml_names:

            xml_names = [n for n in zf.namelist(
            ) if n.lower().endswith(".xml")]

        for name in sorted(xml_names):
            with zf.open(name) as fp:
                data = fp.read()
            try:
                root = ET.fromstring(data)
            except ET.ParseError:
                continue

            for node in root.findall(".//{*}t"):
                if node.text and node.text.strip():
                    texts.append(node.text)

    text = "\n".join(texts)
    text = re.sub(r"[ \t]+\n", "\n", text)         #
    text = re.sub(r"\s{2,}", " ", text)            #
    text = re.sub(r"\s+(?=[\.\,\!\?\:\;])", "", text)
    return text.strip()

def extract_text_by_ext(local_path: str, filename: str) -> str:
    """
    파일 확장자/포맷에 따라 텍스트를 추출.
    - 직접 추출 가능한 포맷: pdf, docx, pptx, xlsx, txt
    - 그 외(ppt, xls, hwp, hwpx, doc, rtf 등)는 LibreOffice로 pdf 변환 후 PDF 추출 재사용
    """
    ext = pathlib.Path(filename).suffix.lower().lstrip(".")
    text = ""

    if ext == "pdf":
        text = extract_pdf_text(local_path)

    elif ext == "docx":
        # mammoth: docx -> plain text
        try:
            import mammoth
            with open(local_path, "rb") as f:
                result = mammoth.extract_raw_text(f)
            text = (result.value or "").strip()
        except Exception as e:
            raise RuntimeError(f"DOCX 처리 오류: {e}")

    elif ext == "pptx":
        # python-pptx: 모든 슬라이드에서 shape.text 모으기
        try:
            from pptx import Presentation
            prs = Presentation(local_path)
            chunks = []
            for slide in prs.slides:
                for shp in slide.shapes:
                    if hasattr(shp, "text") and shp.text:
                        chunks.append(shp.text)
                # 노트 영역까지 필요하면 아래 활성화
                if getattr(slide, "notes_slide", None) and slide.notes_slide.notes_text_frame:
                    chunks.append(slide.notes_slide.notes_text_frame.text)
            text = "\n".join(chunks).strip()
        except Exception as e:
            raise RuntimeError(f"PPTX 처리 오류: {e}")

    elif ext == "xlsx":
        # openpyxl: 셀 텍스트를 시트별로 모으기
        try:
            import openpyxl
            wb = openpyxl.load_workbook(
                local_path, data_only=True, read_only=True)
            rows = []
            for ws in wb.worksheets:
                rows.append(f"### 시트: {ws.title}")
                for row in ws.iter_rows(values_only=True):
                    cells = [str(c) if c is not None else "" for c in row]
                    # 너무 긴 엑셀이면 여기서 줄수/열수 제한 가능
                    rows.append("\t".join(cells))
            text = "\n".join(rows).strip()
        except Exception as e:
            raise RuntimeError(f"XLSX 처리 오류: {e}")

    elif ext == "txt":
        # 단순 텍스트
        try:
            with open(local_path, "rb") as f:
                raw = f.read()
            text = raw.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            raise RuntimeError(f"TXT 처리 오류: {e}")

    elif ext == "hwpx":
        # ✅ LibreOffice 없이 바로 파싱
        text = extract_hwpx_text(local_path)

    elif ext in ("ppt", "xls", "hwp", "doc", "rtf"):
        # 이들은 계속 LibreOffice 변환을 사용
        pdf_path = libreoffice_to_pdf(local_path)
        text = extract_pdf_text(pdf_path)

    else:

        try:
            pdf_path = libreoffice_to_pdf(local_path)
            text = extract_pdf_text(pdf_path)
        except Exception as e:
            raise RuntimeError(f"LibreOffice 변환/추출 실패: {e}")

    return text

@app.post("/fileScan")
async def file_scan(file: UploadFile = File(...)):
    """
    하나의 업로드 엔드포인트로 다양한 문서 포맷을 받아 텍스트만 반환.
    클라이언트: FormData에 'file' 필드로 업로드 (script.js의 extractTextFromAnyFile).
    """
    # 임시 저장
    suffix = pathlib.Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        binary = await file.read()
        tmp.write(binary)
        tmp_path = tmp.name

    try:
        text = extract_text_by_ext(tmp_path, file.filename)

        MAX_CHARS = 100_000
        if len(text) > MAX_CHARS:
            text = text[:MAX_CHARS]

        return {"filename": file.filename, "text": text}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    finally:
        try:
            os.remove(tmp_path)
        except:
            pass


@app.post("/pdfScan")
async def upload_pdf(pdf: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        contents = await pdf.read()
        temp_pdf.write(contents)
        temp_pdf_path = temp_pdf.name

    try:
        cleaned_text = extract_pdf_text(temp_pdf_path)
        return {"filename": pdf.filename, "text": cleaned_text}
    except Exception as e:
        return {"error": f"PDF 처리 중 오류 발생: {str(e)}"}
    finally:
        try:
            os.remove(temp_pdf_path)
        except:
            pass

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

<<<<<<< HEAD
# @app.post("/speech")
#async def upload_audio(audio: UploadFile = File(...)):
=======
@app.post("/speech")
async def upload_audio(audio: UploadFile = File(...)):
>>>>>>> 941529f (Initial commit)
    start_time = time.time()

    # 업로드된 오디오 파일 읽기
    audio_bytes = await audio.read()
    audio_segment = AudioSegment.from_file(BytesIO(audio_bytes), format="wav")

    # (선택) 오디오 전처리
    silence = AudioSegment.silent(duration=1000)
    audio_segment = silence + audio_segment
    audio_segment = audio_segment.set_frame_rate(
        16000).set_channels(1).set_sample_width(2)
    audio_segment = audio_segment.normalize()
    audio_segment += 6

    print("현재 평균 데시벨:", audio_segment.dBFS)

    # 전체 오디오 그대로 사용
    recognizer = sr.Recognizer()
    with BytesIO() as wav_buffer:
        audio_segment.export(wav_buffer, format="wav")
        wav_buffer.seek(0)
        with sr.AudioFile(wav_buffer) as source:
            # (선택) 잡음 보정
            recognizer.adjust_for_ambient_noise(source, duration=1)
            audio_data = recognizer.record(source)  # 전체 파일 한 번에 읽음

            try:
                result = recognizer.recognize_google(
                    audio_data, language="ko-KR", show_all=True)
                if "alternative" in result:
                    text = result["alternative"][0]["transcript"]
                else:
                    text = ""
            except sr.UnknownValueError:
                text = ""
                print("오디오 인식 실패")
            except sr.RequestError as e:
                text = ""
                print("Google Web Speech API 요청 오류:", e)

    elapsed_time = time.time() - start_time

<<<<<<< HEAD
    print("\n" + text + "\n")
    print(round(elapsed_time, 3))
    print()

    return {"text": text, "time": round(elapsed_time, 3)} 

@app.post("/editorGrammar")
async def editorGrammar(content: TextInput):
    
=======
    if (text):
        print("\n" + text + "\n")
    print(f"걸린 시간: {elapsed_time:.3f}초")
    print()

    return {"text": text, "time": round(elapsed_time, 3)}

@app.post("/editorGrammar")
async def editorGrammar(content: TextInput):
>>>>>>> 941529f (Initial commit)
    print(content.content)
    print()

    result = spell_checker.check(content.content)

    print(f"원문        : {result.original}")
    print(f"수정된 문장 : {result.checked}")
    print(f"오류 수     : {result.errors}")
    print(f"단어별 상태 : {list(result.words.keys())}")
    print(f"검사 시간   : {result.time:.4f}초")
    print("-" * 40)

    return {
        "original": result.original,
        "checked": result.checked,
        "errors": result.errors,
        # "words": list(result.words.keys()),
        "time": result.time,
    }
<<<<<<< HEAD
    
=======
@app.post("/promptChange")
async def expand(request: Request):
    body = await request.json()

    content = body.get('content')
    prompt = body.get('prompt')
    print(content)
    print(prompt)
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "당신은 글을 수정해주는 작문 보조 도구입니다."},
            {"role": "user", "content": f"{content}위의 글을 아래 프롬프트에 맞게 수정해줘.\n\n{prompt}"}
        ]
    )
    message = response.choices[0].message.content
    return {"result": message}

@app.post("/promptAdd")
async def expand(request: Request):
    body = await request.json()

    before = body.get('before')
    after = body.get('after')
    prompt = body.get('prompt')

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "당신은 글을 수정해주는 작문 보조 도구입니다."},
            {"role": "user", "content": f"현재 커서 전의 글: {before}\n\n현재 커서 이후의 글: {after}\n\n현재 커서를 기준으로 분리한 글들을 아래 프롬프트에 맞게 수정해줘. 결과는 추가할 글만 알려줘.\n\n{prompt}"}
        ]
    )
    message = response.choices[0].message.content

    # 글 앞 뒤 따옴표 제거
    message = message[1:-1] if len(
        message) >= 2 and message[0] == message[-1] and message[0] in ('"', "'") else message
    print(message)
    return {"result": message}
>>>>>>> 941529f (Initial commit)
