import os
import psycopg2
from pathlib import Path
from openpyxl import load_workbook

BASE_DIR = Path(__file__).resolve().parent
EXCEL_FILE = BASE_DIR / "Пост-мониторинг свод на 14.04.xlsx"

DATABASE_URL = os.environ["DATABASE_URL"]

def norm(v):
    if v is None:
        return ""
    return str(v).strip()

def main():
    print("Using Excel:", EXCEL_FILE)
    wb = load_workbook(EXCEL_FILE, read_only=True, data_only=True)
    ws = wb["перечень"]

    header_row_idx = 2
    header = [norm(v) for v in next(ws.iter_rows(min_row=header_row_idx, max_row=header_row_idx, values_only=True))]

    header_map = {
        "П/п": "row_number",
        "Анализ / мониторингB2:N155M146B2:O16B2:N161": "record_type",
        "ЦИКЛ": "cycle",
        "Сфера": "sphere",
        "Предложения": "proposal_text",
        "Ответственный исполнитель": "responsible_org",
        "Заинтересованные государственные органы": "interested_orgs",
        "Форма завершения": "completion_form",
        "Срок исполнения": "due_raw",
        "Статус ГО": "status_raw",
        "Позиция ГО на 2024-2025гг.": "position_go_2024_2025",
        "Позиция ГО на 27.03.2026": "position_go_2026_03_27",
        "Позиция АДГС": "position_adgs",
        "Кейс": "case_raw",
    }

    col_idx = {}
    for src in header_map.keys():
        try:
            col_idx[src] = header.index(src)
        except ValueError:
            print("WARN: header not found in Excel:", src)

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    print("Truncating registry_records ...")
    cur.execute("truncate table registry_records restart identity;")

    insert_sql = """
        insert into registry_records (
          row_number,
          record_type,
          cycle,
          sphere,
          proposal_text,
          responsible_org,
          interested_orgs,
          completion_form,
          due_raw,
          status_raw,
          status_normalized,
          position_go_2024_2025,
          position_go_2026_03_27,
          position_adgs,
          case_raw
        ) values (
          %(row_number)s,
          %(record_type)s,
          %(cycle)s,
          %(sphere)s,
          %(proposal_text)s,
          %(responsible_org)s,
          %(interested_orgs)s,
          %(completion_form)s,
          %(due_raw)s,
          %(status_raw)s,
          %(status_normalized)s,
          %(position_go_2024_2025)s,
          %(position_go_2026_03_27)s,
          %(position_adgs)s,
          %(case_raw)s
        );
    """

    total = 0
    for row in ws.iter_rows(min_row=header_row_idx + 1, values_only=True):
        cells = [norm(v) for v in row]
        if not any(cells):
            continue

        rec = {dst: "" for dst in header_map.values()}
        for src, dst in header_map.items():
            if src not in col_idx:
                continue
            idx = col_idx[src]
            if idx < len(cells):
                rec[dst] = cells[idx]

        if rec.get("row_number"):
            try:
                rec["row_number"] = int(float(rec["row_number"]))
            except ValueError:
                rec["row_number"] = None
        else:
            rec["row_number"] = None

        # нормализованный статус для удобства
        status = norm(rec["status_raw"])
        rec["status_normalized"] = status

        cur.execute(insert_sql, rec)
        total += 1

    conn.commit()
    cur.close()
    conn.close()
    print("Inserted rows into registry_records:", total)

if __name__ == "__main__":
    main()
