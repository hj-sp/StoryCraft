# ① 가벼운 파이썬 베이스 이미지
FROM python:3.11-slim

# ② 시스템 패키지(PortAudio 포함) 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    portaudio19-dev build-essential \
 && rm -rf /var/lib/apt/lists/*

# ③ 기본 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ④ 의존성 먼저 설치(캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ⑤ 앱 소스 복사
COPY . .

# ⑥ 포트: Render가 환경변수 PORT를 내려줍니다(로컬 기본 10000)
ENV PORT=10000

# ⑦ 서버 실행 (FastAPI/Starlette 가정: main.py 안의 app 객체)
#    필요에 맞게 모듈/객체 이름 변경: main:app / app:app 등
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:${PORT}", "main:app"]
