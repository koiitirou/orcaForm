# -*- coding: utf-8 -*-
"""
WebORCA Cloud API クライアントモジュール

クライアント証明書認証 + ベーシック認証で WebORCA Cloud API に接続し、
患者基本情報を取得する。
"""

import json
import os
import ssl
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context


class SSLAdapter(HTTPAdapter):
    """クライアント証明書 + CA証明書を使ったSSLアダプター"""

    def __init__(self, cert_file, key_file, ca_file, key_password=None, **kwargs):
        self.cert_file = cert_file
        self.key_file = key_file
        self.ca_file = ca_file
        self.key_password = key_password
        super().__init__(**kwargs)

    def init_poolmanager(self, *args, **kwargs):
        ctx = create_urllib3_context()
        ctx.load_cert_chain(
            certfile=self.cert_file,
            keyfile=self.key_file,
            password=self.key_password,
        )
        ctx.load_verify_locations(cafile=self.ca_file)
        ctx.verify_mode = ssl.CERT_REQUIRED
        kwargs["ssl_context"] = ctx
        return super().init_poolmanager(*args, **kwargs)


class OrcaClient:
    """WebORCA Cloud API クライアント"""

    def __init__(self, config_path="config.json"):
        """
        設定ファイルを読み込み、HTTPセッションを初期化する。

        Parameters
        ----------
        config_path : str
            config.json のパス
        """
        base_dir = os.path.dirname(os.path.abspath(config_path))
        if not os.path.isabs(config_path):
            config_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)), config_path
            )

        with open(config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        # 証明書パスをプロジェクトディレクトリ基準の絶対パスに変換
        project_dir = os.path.dirname(os.path.abspath(__file__))
        self.cert_file = os.path.join(project_dir, self.config["cert_file"])
        self.key_file = os.path.join(project_dir, self.config["key_file"])
        self.ca_file = os.path.join(project_dir, self.config["ca_file"])
        self.key_password = self.config.get("key_password")

        self.api_url = self.config["api_url"]
        self.api_user = self.config["api_user"]
        self.api_key = self.config["api_key"]

        # HTTPセッション作成
        self.session = requests.Session()
        self.session.auth = (self.api_user, self.api_key)

        # SSL アダプターをマウント
        adapter = SSLAdapter(
            cert_file=self.cert_file,
            key_file=self.key_file,
            ca_file=self.ca_file,
            key_password=self.key_password,
        )
        self.session.mount("https://", adapter)

    def _request(self, method, url, **kwargs):
        """共通リクエスト処理（エラーハンドリング付き）"""
        try:
            response = getattr(self.session, method)(url, timeout=30, **kwargs)
            return {
                "status_code": response.status_code,
                "body": response.text,
                "success": response.status_code == 200,
            }
        except requests.exceptions.SSLError as e:
            return {
                "status_code": None,
                "body": f"SSL接続エラー:\n{str(e)}",
                "success": False,
            }
        except requests.exceptions.ConnectionError as e:
            return {
                "status_code": None,
                "body": f"接続エラー:\n{str(e)}",
                "success": False,
            }
        except requests.exceptions.Timeout:
            return {
                "status_code": None,
                "body": "タイムアウト: サーバーからの応答がありません",
                "success": False,
            }
        except Exception as e:
            return {
                "status_code": None,
                "body": f"予期しないエラー:\n{str(e)}",
                "success": False,
            }

    def get_patient(self, patient_id):
        """患者基本情報を取得する (GET /api/api01rv2/patientgetv2)"""
        url = f"{self.api_url}/api/api01rv2/patientgetv2"
        params = {"id": patient_id, "format": "xml"}
        return self._request("get", url, params=params)

    def post_medical(self, xml_body, class_type="01"):
        """
        中途終了データを登録する (POST /api21/medicalmodv2)

        Parameters
        ----------
        xml_body : str
            リクエストXMLボディ
        class_type : str
            01=登録, 02=削除, 03=変更, 04=外来追加
        """
        url = f"{self.api_url}/api/api21/medicalmodv2"
        params = {"class": class_type}
        headers = {"Content-Type": "application/xml; charset=UTF-8"}
        return self._request("post", url, params=params, data=xml_body.encode("utf-8"), headers=headers)

    def get_staff_list(self, list_type="02"):
        """
        職員一覧を取得する (POST /api/api01rv2/system01lstv2)

        Parameters
        ----------
        list_type : str
            02=ドクター一覧, 03=職員一覧（ドクター以外）
        """
        url = f"{self.api_url}/api/api01rv2/system01lstv2"
        params = {"class": list_type}
        xml_body = """<data>
        <system01_managereq type="record">
                <Request_Number type="string">{}</Request_Number>
        </system01_managereq>
</data>""".format(list_type)
        headers = {"Content-Type": "application/xml; charset=UTF-8"}
        return self._request("post", url, params=params, data=xml_body.encode("utf-8"), headers=headers)

    def get_medical_data(self, patient_id, perform_date=""):
        """
        診療月の診療行為データを取得する (POST /api/api21/medicalgetv2?class=03)

        Parameters
        ----------
        patient_id : str
            患者ID
        perform_date : str
            診療日 (例: "2026-03-05")。未指定の場合は当日。
        """
        url = f"{self.api_url}/api/api01rv2/medicalgetv2"
        params = {"class": "03"}
        xml_body = f"""<data>
        <medicalgetreq type="record">
                <Patient_ID type="string">{patient_id}</Patient_ID>
                <Perform_Date type="string">{perform_date}</Perform_Date>
        </medicalgetreq>
</data>"""
        headers = {"Content-Type": "application/xml; charset=UTF-8"}
        return self._request("post", url, params=params, data=xml_body.encode("utf-8"), headers=headers)

    def get_medical_points(self, patient_id, perform_date=""):
        """
        診療区分別剤点数を取得する (POST /api/api01rv2/medicalgetv2?class=04)

        Parameters
        ----------
        patient_id : str
            患者ID
        perform_date : str
            診療日 (例: "2026-03-01")。未指定の場合は当日。
        """
        url = f"{self.api_url}/api/api01rv2/medicalgetv2"
        params = {"class": "04"}
        xml_body = f"""<data>
        <medicalgetreq type="record">
                <Patient_ID type="string">{patient_id}</Patient_ID>
                <Perform_Date type="string">{perform_date}</Perform_Date>
        </medicalgetreq>
</data>"""
        headers = {"Content-Type": "application/xml; charset=UTF-8"}
        return self._request("post", url, params=params, data=xml_body.encode("utf-8"), headers=headers)

    def close(self):
        """セッションをクローズする"""
        self.session.close()


def build_medical_xml(
    patient_id,
    perform_date,
    perform_time,
    department_code="01",
    physician_code="10001",
    insurance_combination_number="",
    medical_items=None,
):
    """
    中途終了データ登録用のリクエストXMLを構築する。

    Parameters
    ----------
    patient_id : str
        患者ID
    perform_date : str
        診療日 (例: "2026-03-02")
    perform_time : str
        診療時間 (例: "14:00:00")
    department_code : str
        診療科コード (デフォルト: "01"=内科)
    physician_code : str
        ドクターコード (デフォルト: "10001")
    insurance_combination_number : str
        保険組合せ番号 (空の場合は自動判定)
    medical_items : list of dict, optional
        診療行為リスト。各要素は:
        {
            "class": "120",          # 診療種別（120=再診, 210=内服等）
            "class_name": "再診",
            "class_number": "1",     # 回数
            "medications": [
                {"code": "112007410", "name": "再診", "number": "1"}
            ]
        }

    Returns
    -------
    str
        リクエストXML文字列
    """
    # デフォルト: 再診のみ
    if medical_items is None:
        medical_items = [
            {
                "class": "120",
                "class_name": "再診",
                "class_number": "1",
                "medications": [
                    {"code": "112007410", "name": "再診", "number": "1"}
                ],
            }
        ]

    # Medical_Information 部分を生成
    medical_info_xml = ""
    for item in medical_items:
        meds_xml = ""
        for med in item.get("medications", []):
            meds_xml += f"""
                                <Medication_info_child type="record">
                                        <Medication_Code type="string">{med['code']}</Medication_Code>
                                        <Medication_Name type="string">{med['name']}</Medication_Name>
                                        <Medication_Number type="string">{med['number']}</Medication_Number>
                                        <Medication_Generic_Flg type="string"></Medication_Generic_Flg>
                                </Medication_info_child>"""

        medical_info_xml += f"""
                        <Medical_Information_child type="record">
                                <Medical_Class type="string">{item['class']}</Medical_Class>
                                <Medical_Class_Name type="string">{item['class_name']}</Medical_Class_Name>
                                <Medical_Class_Number type="string">{item['class_number']}</Medical_Class_Number>
                                <Medication_info type="array">{meds_xml}
                                </Medication_info>
                        </Medical_Information_child>"""

    xml = f"""<data>
        <medicalreq type="record">
                <InOut type="string"></InOut>
                <Patient_ID type="string">{patient_id}</Patient_ID>
                <Perform_Date type="string">{perform_date}</Perform_Date>
                <Perform_Time type="string">{perform_time}</Perform_Time>
                <Medical_Uid type="string"></Medical_Uid>
                <Diagnosis_Information type="record">
                        <Department_Code type="string">{department_code}</Department_Code>
                        <Physician_Code type="string">{physician_code}</Physician_Code>
                        <HealthInsurance_Information type="record">
                                <Insurance_Combination_Number type="string">{insurance_combination_number}</Insurance_Combination_Number>
                        </HealthInsurance_Information>
                        <Medical_Information type="array">{medical_info_xml}
                        </Medical_Information>
                </Diagnosis_Information>
        </medicalreq>
</data>"""
    return xml
