# -*- coding: utf-8 -*-
"""
診療行為 APIルーター

Chrome拡張からの送信リクエストを受け、ORCA APIに転送する。
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import orca_service, xml_builder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/medical", tags=["medical"])


# === リクエスト/レスポンスモデル ===

class SendRequest(BaseModel):
    """XML送信リクエスト"""
    xml: str
    class_type: str = "01"  # 01=登録, 03=変更


class SendWithCodesRequest(BaseModel):
    """コード注入付き送信リクエスト"""
    xml: str
    class_type: str = "01"
    inject_820: bool = True
    debug: bool = False


class SendResponse(BaseModel):
    """送信結果"""
    success: bool
    status_code: int | None = None
    body: str = ""
    injected: bool = False
    # デバッグ用
    debug_sent_xml: str | None = None
    debug_orca_response: str | None = None


class StatusResponse(BaseModel):
    """ヘルスチェック"""
    status: str = "ok"
    message: str = ""


# === エンドポイント ===

@router.get("/status", response_model=StatusResponse)
async def health_check():
    """サーバーとORCA APIの疎通確認"""
    return StatusResponse(status="ok", message="ORCA Proxy Server is running")


@router.post("/send", response_model=SendResponse)
async def send_medical(req: SendRequest):
    """XMLをそのままORCA APIに送信する。"""
    try:
        result = orca_service.send_medical_xml(req.xml, req.class_type)
        return SendResponse(
            success=result["success"],
            status_code=result["status_code"],
            body=result["body"],
        )
    except Exception as e:
        logger.error(f"送信エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-with-codes")
async def send_with_codes(req: SendWithCodesRequest):
    """
    XMLに.820コードを注入してからORCA APIに送信する。
    """
    xml = req.xml
    injected = False

    try:
        if req.inject_820:
            if xml_builder.has_prescription(xml):
                xml = xml_builder.inject_820_codes(xml)
                injected = xml != req.xml
                if injected:
                    logger.info("820コード注入完了")
                else:
                    logger.info("820コードは既に存在")
            else:
                logger.info("処方（212）なし → 820注入スキップ")

        result = orca_service.send_medical_xml(xml, req.class_type)

        return {
            "success": result["success"],
            "status_code": result["status_code"],
            "body": result["body"],
            "injected": injected,
            "injected_xml": xml if injected else None,
        }
    except Exception as e:
        logger.error(f"送信エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
