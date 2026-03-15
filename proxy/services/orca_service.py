# -*- coding: utf-8 -*-
"""
ORCA APIサービス層

OrcaClientをラップし、ビジネスロジックを提供する。
将来的にVertex AI連携もここに追加する。
"""

import os
import sys
import logging

# orca_client.py は親ディレクトリにある
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from orca_client import OrcaClient

logger = logging.getLogger(__name__)

# シングルトンのORCAクライアント
_client: OrcaClient | None = None


def get_client() -> OrcaClient:
    """OrcaClientのシングルトンインスタンスを取得"""
    global _client
    if _client is None:
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "config.json"
        )
        _client = OrcaClient(config_path)
        logger.info("OrcaClient 初期化完了")
    return _client


def send_medical_xml(xml_body: str, class_type: str = "01") -> dict:
    """
    ORCA APIに診療データを送信する。

    Parameters
    ----------
    xml_body : str
        リクエストXML
    class_type : str
        01=登録, 02=削除, 03=変更, 04=外来追加

    Returns
    -------
    dict
        {"success": bool, "status_code": int|None, "body": str}
    """
    client = get_client()
    logger.info(f"ORCA API送信: class={class_type}, XML長さ={len(xml_body)}")
    result = client.post_medical(xml_body, class_type)
    logger.info(f"ORCA API応答: status={result['status_code']}, success={result['success']}")
    return result


def get_patient_info(patient_id: str) -> dict:
    """患者情報を取得"""
    client = get_client()
    return client.get_patient(patient_id)


def get_medical_data(patient_id: str, perform_date: str = "") -> dict:
    """診療データを取得"""
    client = get_client()
    return client.get_medical_data(patient_id, perform_date)
