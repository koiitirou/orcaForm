# -*- coding: utf-8 -*-
"""
XML構築・編集サービス

ORCA APIに送信するXMLの構築、解析、コード注入を行う。
"""


def inject_820_codes(xml_str: str) -> str:
    """
    XMLに.820コードブロックを注入する。

    アプローチ: WebORCAと同じ構造で3コードを1つのMedical_Information_childに入れる。
    099999908 = 包括算定（剤）
    120002910 = C処方箋料（リフィル以外・その他）← Medication_Name付きで試行

    Parameters
    ----------
    xml_str : str
        元のCLAIM XML文字列

    Returns
    -------
    str
        .820コード注入後のXML文字列
    """
    # 既に820が含まれていれば重複注入しない
    if ">820<" in xml_str or ">.820<" in xml_str:
        return xml_str

    # 820 + 099999908 + 120002110
    inject_block = (
        '<Medical_Information_child type="record">'
        '<Medical_Class type="string">820</Medical_Class>'
        '<Medical_Class_Number type="string">1</Medical_Class_Number>'
        '<Medication_info type="array">'
        '<Medication_info_child type="record">'
        '<Medication_Code type="string">099999908</Medication_Code>'
        '<Medication_Name type="string">包括算定（剤）</Medication_Name>'
        '<Medication_Number type="string">1</Medication_Number>'
        '</Medication_info_child>'
        '<Medication_info_child type="record">'
        '<Medication_Code type="string">120002110</Medication_Code>'
        '<Medication_Name type="string">処方箋料（その他）</Medication_Name>'
        '<Medication_Number type="string">1</Medication_Number>'
        '</Medication_info_child>'
        '</Medication_info>'
        '</Medical_Information_child>'
    )

    close_tag = "</Medical_Information>"
    insert_pos = xml_str.rfind(close_tag)
    if insert_pos == -1:
        return xml_str

    return xml_str[:insert_pos] + inject_block + xml_str[insert_pos:]


def has_prescription(xml_str: str) -> bool:
    """XMLに処方（212）が含まれるかチェック"""
    return ">212<" in xml_str


def extract_patient_id(xml_str: str) -> str | None:
    """XMLからPatient_IDを抽出"""
    import re
    match = re.search(r"<Patient_ID[^>]*>(\d+)</Patient_ID>", xml_str)
    return match.group(1) if match else None


def extract_perform_date(xml_str: str) -> str | None:
    """XMLからPerform_Dateを抽出"""
    import re
    match = re.search(r"<Perform_Date[^>]*>([^<]+)</Perform_Date>", xml_str)
    return match.group(1) if match else None
