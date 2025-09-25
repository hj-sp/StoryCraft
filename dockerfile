# ① 가벼운 파이썬 베이스 이미지
FROM python:3.11-slim

ARG DEBIAN_FRONTEND=noninteractive

# ✅ wheel 빌드를 위한 도구/헤더들
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ make \
    python3-dev libffi-dev libssl-dev \
    # 필요시 활성화 (DB, XML, 이미지, 오디오 등):
    libpq-dev libxml2-dev libxslt1-dev zlib1g-dev \
    libjpeg62-turbo-dev libpng-dev libtiff5 \
    portaudio19-dev \
 && rm -rf /var/lib/apt/lists/*

# ③ 기본 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ④ 의존성 먼저 설치(캐시 활용)
COPY requirements.txt .
# ✅ 빌드 툴 최신화 후 설치
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=10000
CMD ["gunicorn","-k","uvicorn.workers.UvicornWorker","--bind","0.0.0.0:${PORT}","main:app"]