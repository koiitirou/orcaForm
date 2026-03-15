# -*- coding: utf-8 -*-
"""
ORCA API プロキシサーバー

Chrome拡張からのリクエストを受け、クライアント証明書認証付きで
ORCA Cloud APIに転送する中継サーバー。

Usage:
    python server.py
    → http://localhost:5100 で起動

将来的にVertex AI連携機能を追加予定。
"""

import os
import sys
import logging

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import medical

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("orca-proxy")

# FastAPI アプリ
app = FastAPI(
    title="ORCA API Proxy",
    description="Chrome拡張 → ORCA Cloud API 中継サーバー",
    version="0.1.0",
)

# CORS: Chrome拡張とlocalhost からのアクセスを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://172.28.22.148",         # orderconvert
        "https://weborca.cloud.orcamo.jp",  # WebORCA Cloud
        "chrome-extension://*",          # Chrome拡張
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(medical.router)


@app.get("/")
async def root():
    return {
        "name": "ORCA API Proxy",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    logger.info("ORCA API Proxy Server 起動中...")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=5100,
        reload=True,
        reload_dirs=[os.path.dirname(os.path.abspath(__file__))],
        log_level="info",
    )
