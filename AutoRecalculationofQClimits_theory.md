# **Kho Tri Thức: Engine Tự Động Tính Toán Lại Giới Hạn QC**

Tài liệu này tổng hợp toàn bộ kiến thức, best practices, logic, và kế hoạch triển khai cho tính năng tự động tính toán lại Mean/SD và vẽ lại biểu đồ Levey-Jennings (LJ) dựa trên N lần chạy gần nhất.

## **1\. Best Practices & Nguyên Tắc Cốt Lõi**

### **1.1. Tóm Lược (TL;DR \- Đề xuất thực dụng)**

* **Ngưỡng kích hoạt**: Khi có ≥ 20 kết quả được chấp nhận (in-control) cho mỗi tổ hợp “test × level × lot × device” trong ≥ 10 ngày làm việc; tốt hơn nếu ≥ 20 ngày. (Nguồn: Westgard QC, Bio-Rad)  
* **Tập tính toán**: Dùng “accepted only”, loại trừ mọi run có vi phạm Westgard (1\_3s, 2\_2s, R\_4s, 4\_1s, 10x); 1\_2s có thể coi là cảnh báo → loại khỏi ước lượng để tránh “phình SD”. (2 SD dễ gây false reject, nên tránh dùng ±2SD làm giới hạn kiểm soát mặc định.) (Nguồn: Westgard QC)  
* **Cửa sổ**: Mặc định 20 run gần nhất (rolling window); nếu đủ dữ liệu, xem xét 30–60 để ổn định hơn; với mục đích tính MU/CV dài hạn, lý tưởng \~100 điểm. (Nguồn: documents.cap.org)  
* **Ước lượng**:  
  * N\<40: mean & SD mẫu nhưng winsorize nhẹ (5%) hoặc loại outlier theo rule → ổn định hơn.  
  * N≥40: mean & SD mẫu chuẩn.  
* **Nguồn tham chiếu**: Mean nội bộ là chuẩn; giá trị hãng/peer chỉ là tạm thời/hướng dẫn cho tới khi có đủ dữ liệu nội bộ. (Nguồn: Bio-Rad, https://www.google.com/search?q=toolkits.horiba-abx.com)  
* **Quy trình áp dụng**: Đề xuất tự động – phê duyệt thủ công (QA/Director) trước khi “đặt lại” giới hạn → lưu version và effective\_from/effective\_to. (CLIA yêu cầu lab thiết lập/ xác minh tiêu chí chấp nhận của QC, và thường yêu cầu review/approve.) (Nguồn: https://www.google.com/search?q=toolkits.horiba-abx.com, eCFR)  
* **Biểu đồ LJ**: Cho phép toggle giữa “Manufacturer/Peer”, “Observed (Rolling-N)”, và “Cumulative-by-Lot”; luôn hiển thị N dùng để tính và khoảng thời gian của N điểm. (LJ mặc định vẽ mean ±1/±2/±3 SD). (Nguồn: Bio-Rad)

### **1.2. Lý Do Khuyến Nghị ≥20 Điểm**

* **Westgard/CLSI**: “Quy tắc ngón tay cái” là ≥20 điểm trong ≥2 tuần (tốt nhất ≥4 tuần); lấy quá ngắn sẽ hạ ước lượng SD → tăng false reject. (Nguồn: Westgard QC)  
* **CAP 15189 (Measurement Uncertainty)**: Tối thiểu 20, lý tưởng \~100 để đại diện thay đổi lot/bảo trì/instrument. (Nguồn: documents.cap.org)  
* **Khi chưa đủ 20**: Có thể dùng giá trị hãng/peer để tạm vẽ LJ, nhưng phải thay bằng dữ liệu nội bộ khi đã đủ. (Nguồn: Bio-Rad, Westgard QC)

## **2\. Logic Đề Xuất của Engine**

* **Phân nhóm cố định**: Tính riêng cho từng (test × level × lot × device) để tránh lẫn trôi bias. (Ràng buộc này đồng bộ với cách bạn seed/giới hạn hiện tại.)  
* **Chọn dữ liệu “in-control”**: Lấy các run có status='accepted' và không có rule vi phạm (ít nhất là loại 1\_3s, 2\_2s, R\_4s, 4\_1s, 10x; khuyến nghị loại luôn 1\_2s khỏi ước lượng). (Nguồn: Westgard QC)  
* **Cửa sổ rolling**: Lấy N run mới nhất (mặc định 20). Nếu số ngày phủ \<10 ngày làm việc, tạm chưa đề xuất vì SD có thể thấp giả. (Nguồn: Westgard QC)  
* **Ước lượng thống kê**:  
  * mean \= avg(value); sd \= stddev\_samp(value).  
  * Tuỳ chọn robust hoá: winsorize 5% hoặc loại cực trị theo IQR nếu N nhỏ. (Mục tiêu: không để vài điểm rìa “kéo” SD.)  
* **So sánh & tiêu chí đề xuất**:  
  * Đề xuất cập nhật nếu |Δmean| \> 10% of current SD hoặc ΔCV \> 20% (tuỳ test), và biểu đồ/Westgard ổn định trong 20 điểm (không chuỗi vi phạm).  
* **Kiểm tra thay đổi hệ thống**: Reset cửa sổ khi: đổi lot, calibration, major maintenance, device hoặc method.  
* **Quy trình phê duyệt**: Tạo proposal (bản nháp limits mới), QA review/approve, sau đó versioning (effective\_from với dấu vết người duyệt). (Nhiều SOP cũng yêu cầu ký duyệt.) (Nguồn: PowerDMS)  
* **Vẽ LJ**:  
  * Vẽ 3 bộ đường (ẩn/hiện được): Manufacturer/Peer, Cumulative-by-Lot, Rolling-N.  
  * Chú thích: “N=20 (2025-08-10 → 2025-09-07), mean=… sd=… CV=…”.  
  * Giữ multi-rules (1\_3s, 2\_2s, R\_4s, 4\_1s, 10x) để giám sát liên tục. (Nguồn: Bio-Rad)  
* **Không “tự động áp”**: Engine chỉ đề xuất; tránh “đuổi theo” noise → trượt chuẩn (Westgard cảnh báo ±2SD/SD quá nhỏ khiến false reject tăng). (Nguồn: Westgard QC+1)

## **3\. Hướng Dẫn Triển Khai Kỹ Thuật**

### **3.1. SQL/Pseudo-code (PostgreSQL) – “Đề xuất limits Rolling-20”**

\-- Tạo đề xuất cho 1 nhóm (CREA × L1 × lot hiện hành × C311)  
WITH grp AS (  
  SELECT  
    t.id  AS test\_id,  
    l.id  AS level\_id,  
    ql.id AS lot\_id,  
    d.id  AS device\_id  
  FROM tests t  
  JOIN qc\_levels l ON l.test\_id=t.id AND l.level='L1'  
  JOIN qc\_lots   ql ON ql.level\_id=l.id AND ql.effective\_to IS NULL  
  JOIN devices   d  ON d.code='C311'  
  WHERE t.code='CREA'  
),  
lastN AS (  
  SELECT r.value, r.run\_at  
  FROM qc\_runs r, grp g  
  WHERE r.test\_id=g.test\_id AND r.level\_id=g.level\_id  
    AND r.lot\_id=g.lot\_id AND r.device\_id=g.device\_id  
    AND r.status='accepted'  
    \-- loại điểm có vi phạm (tuỳ bạn đang lưu flags/violations ở đâu)  
    AND NOT EXISTS (  
      SELECT 1 FROM violations v WHERE v.run\_id=r.id  
        AND v.rule\_code IN ('1-3s','2-2s','R-4s','4-1s','10x','1-2s')  
    )  
  ORDER BY r.run\_at DESC  
  LIMIT 20  
),  
span AS (SELECT MIN(run\_at) AS from\_at, MAX(run\_at) AS to\_at, COUNT(\*) AS n FROM lastN),  
calc AS (  
  SELECT  
    AVG(value)::numeric(12,4) AS mean,  
    STDDEV\_SAMP(value)::numeric(12,4) AS sd,  
    (STDDEV\_SAMP(value)/NULLIF(AVG(value),0)\*100)::numeric(6,2) AS cv  
  FROM lastN  
)  
SELECT n, from\_at, to\_at, mean, sd, cv FROM span, calc;

**Ghi chú**: Kết quả dùng để tạo một “proposal” (ghi vào bảng qc\_limit\_proposals hoặc field “draft” trong qc\_limits). Sau khi QA duyệt, copy sang bản chính và set effective\_from.

### **3.2. Gợi ý UI/Workflow (Next.js 14 \+ Drizzle \+ Neon)**

* **/charts/lj**: Thêm Menu Limits → Manufacturer | Cumulative | Rolling-20.  
* **/inbox/approval**: Thẻ “QC Limit Proposals” hiển thị: test/level/lot/device, N & date span, mean/sd/cv cũ vs mới, sparkline 20 điểm, nút Approve/Reject (ghi lý do).  
* **/dashboard**: Widget “Re-baselining suggestions” khi engine phát hiện đủ điều kiện.  
* **Versioning**: Bảng qc\_limits giữ nhiều bản theo thời gian; truy vấn LJ chọn bản có effective\_from ≤ time \< effective\_to tương ứng.

### **3.3. Thông Tin Bổ Sung (Nên biết)**

* **Patient-based QC (Moving Average, Moving Median)** có thể chạy song song để phát hiện drift từ dữ liệu bệnh nhân (đặc biệt khi QC vật liệu ổn nhưng hệ thống lệch). Đừng thay thế IQC bằng PBRTQC, hãy dùng bổ trợ. (Nguồn: captodayonline.com)  
* **Hãng (Bio-Rad, Roche…)** đều khuyên vẽ LJ với ±3 SD và thiết kế multi-rules; document hoá toàn bộ SOP/troubleshooting. (Nguồn: Bio-Rad, https://www.google.com/search?q=elabdoc-prod.roche.com, iacld.com)

## **4\. Prompt để Giao cho AI Agent Triển khai**

Phần này ghi lại quá trình thảo luận và các phiên bản prompt JSON được tạo ra để giao cho Agent AI thực thi.

### **4.1. Prompt v1.0 \- Gói gọn tri thức và kế hoạch**

You said:  
Tôi đang dùng Agent để build app, hãy đóng gói tất cả tri thức mà bạn vừa brainstorm, cùng với các tasks cần thực hiện thành một JSON prompt để tôi giao cho Agent thực thi bổ sung cũng như là enhance tính năng này vào app (tham khảo lại lịch sử trò chuyện của chúng ta trong file CSV để biết rõ hơn về JSON prompt mà tôi yêu cầu bạn tạo)  
ChatGPT said:  
Tuyệt—dưới đây là JSON prompt gói gọn tri thức \+ kế hoạch công việc để bạn giao cho Agent triển khai tính năng tự tính lại mean/SD theo Rolling-N và LJ vẽ lại giới hạn. JSON này bám đúng stack & schema dự án (Next.js 14 App Router \+ TypeScript \+ Tailwind \+ Drizzle \+ Neon; tables: tests, devices, qc\_levels, qc\_lots, qc\_limits, qc\_runs, violations, run\_groups) và các quy ước trước đây (VI, dấu “.”, Asia/Ho\_Chi\_Minh, không realtime).

{  
  "title": "Implement Rolling-N Auto Recalculation for IQC Limits and LJ Overlays",  
  "summary": "Thêm engine tự tính mean/SD theo cửa sổ N điểm gần nhất (mặc định N=20) trên từng tổ hợp (test × level × lot × device), loại trừ điểm out-of-control theo Westgard, sinh đề xuất (proposal) cập nhật qc\_limits để QA phê duyệt, và cho phép LJ chart chọn giữa Manufacturer | Observed (Rolling-N) | Cumulative-by-Lot.",  
  "assumptions": {  
    "language": "vi",  
    "timezone": "Asia/Ho\_Chi\_Minh",  
    "decimal\_separator": ".",  
    "stack": "Next.js 14 App Router \+ TypeScript \+ Tailwind \+ Drizzle ORM \+ PostgreSQL (Neon)",  
    "modules": \["/quick-entry", "/charts/lj", "/dashboard", "/inbox/approval", "/config/\*"\],  
    "rules\_default": {"1\_3s": "reject", "1\_2s": "warning"},  
    "schema": {  
      "tables": \["tests","devices","qc\_levels","qc\_lots","qc\_limits","qc\_runs","violations","run\_groups"\],  
      "qc\_runs\_core\_fields": \["id","created\_at|run\_at","test\_id","device\_id","level\_id","lot\_id","value","status","z|z\_score"\]  
    }  
  },  
  "feature\_flags": {  
    "existing": \["RULE\_CONFIG\_UI"\],  
    "add": \["ROLLING\_LIMITS\_UI","ROLLING\_LIMITS\_ENGINE"\]  
  },  
  "parameters": {  
    "ROLLING\_N\_DEFAULT": 20,  
    "ROLLING\_N\_MIN": 20,  
    "MIN\_WORKING\_DAYS\_SPAN": 10,  
    "EXCLUDE\_RULES\_FOR\_ESTIMATION": \["1-3s","2-2s","R-4s","4-1s","10x","1-2s"\],  
    "STATUS\_INCLUDED": \["accepted"\],  
    "PROPOSAL\_APPLY\_NEEDS\_APPROVAL": true  
  },  
  "business\_rules": \[  
    "Tính riêng theo (test\_id × level\_id × lot\_id × device\_id).",  
    "Chỉ dùng điểm in-control: status ∈ STATUS\_INCLUDED và KHÔNG có violations ∈ EXCLUDE\_RULES\_FOR\_ESTIMATION.",  
    "Cửa sổ Rolling dùng N điểm mới nhất (mặc định N=20). Nếu span thời gian \< MIN\_WORKING\_DAYS\_SPAN thì chưa tạo proposal.",  
    "Không auto-apply. Phải có QA/Director approve. Lưu vết người duyệt và thời điểm áp dụng.",  
    "Reset cửa sổ khi đổi lot, calibration lớn, major maintenance, thay device/method.",  
    "LJ cho phép overlay 3 nguồn giới hạn: Manufacturer/Peer (từ qc\_limits hiện có), Observed (Rolling-N), Cumulative-by-Lot."  
  \],  
  "api\_design": \[  
    {  
      "method": "GET",  
      "path": "/api/qc/limits/proposal",  
      "query": "testCode, level=L1|L2|L3, lotCode, deviceCode, n? (default 20)",  
      "response": {  
        "ok": true,  
        "group": {"testCode": "CREA", "level": "L1", "lotCode": "CTRL-2025A", "deviceCode": "C311"},  
        "window": {"n": 20, "from": "2025-08-10T08:00:00+07:00", "to": "2025-09-07T10:00:00+07:00"},  
        "stats": {"mean": 89.97, "sd": 5.12, "cv": 5.69},  
        "currentLimits": {"mean": 90.0, "sd": 5.0, "cv": 5.56, "source": "manufacturer"},  
        "eligible": true,  
        "reasons": \[\]  
      }  
    },  
    {  
      "method": "POST",  
      "path": "/api/qc/limits/apply",  
      "body": {  
        "testCode": "CREA",  
        "level": "L1",  
        "lotCode": "CTRL-2025A",  
        "deviceCode": "C311",  
        "rollingN": 20,  
        "mean": 89.97,  
        "sd": 5.12,  
        "cv": 5.69,  
        "source": "lab",  
        "approvedByUserId": "\<uuid\>"  
      },  
      "behavior": "Upsert qc\_limits cho tổ hợp trên với source='lab'. Trả về bản ghi mới và lịch sử cũ (nếu cần)."  
    },  
    {  
      "method": "GET",  
      "path": "/api/qc/limits/history",  
      "query": "testCode, level, lotCode, deviceCode",  
      "behavior": "Trả về danh sách limits theo thời gian (manufacturer/lab) để so sánh."  
    }  
  \],  
  "sql\_snippets": {  
    "proposal\_single\_group": "WITH grp AS ( SELECT t.id AS test\_id, l.id AS level\_id, ql.id AS lot\_id, d.id AS device\_id FROM tests t JOIN qc\_levels l ON l.test\_id=t.id AND l.level \= $1 JOIN qc\_lots ql ON ql.level\_id=l.id AND ql.lot\_code \= $2 JOIN devices d ON d.code=$3 WHERE t.code=$4 ), lastN AS ( SELECT r.value, r.created\_at AS run\_at FROM qc\_runs r, grp g WHERE r.test\_id=g.test\_id AND r.level\_id=g.level\_id AND r.lot\_id=g.lot\_id AND r.device\_id=g.device\_id AND r.status \= 'accepted' AND NOT EXISTS ( SELECT 1 FROM violations v WHERE v.run\_id \= r.id AND v.rule\_code \= ANY ($5) ) ORDER BY r.created\_at DESC LIMIT $6 ), span AS ( SELECT MIN(run\_at) AS from\_at, MAX(run\_at) AS to\_at, COUNT(\*) AS n FROM lastN ), calc AS ( SELECT AVG(value)::numeric(12,4) AS mean, STDDEV\_SAMP(value)::numeric(12,4) AS sd, (STDDEV\_SAMP(value)/NULLIF(AVG(value),0)\*100)::numeric(6,2) AS cv FROM lastN ) SELECT n, from\_at, to\_at, mean, sd, cv FROM span, calc;",  
    "apply\_limits\_upsert": "/\* Upsert qc\_limits theo (test\_id, level\_id, lot\_id, device\_id). Nếu không có UNIQUE, hãy SELECT/INSERT/UPDATE theo where-not-exists. \*/"  
  },  
  "ui\_changes": \[  
    {  
      "route": "/charts/lj",  
      "changes": \[  
        "Thêm Selector: Limits \= Manufacturer | Observed (Rolling-N) | Cumulative-by-Lot.",  
        "Hiển thị nhãn chú thích: N và khoảng thời gian N điểm (from→to), mean/sd/cv.",  
        "Nút 'Đề xuất (Rolling-N)' để gọi GET /api/qc/limits/proposal; nếu eligible, show Drawer với so sánh Current vs Proposed \+ sparkline; nút Apply (gọi POST /api/qc/limits/apply).",  
        "Giữ multi-rules overlay (1\_3s, 2\_2s, R\_4s, 4\_1s, 10x)."  
      \]  
    },  
    {  
      "route": "/inbox/approval",  
      "changes": \[  
        "Tab 'QC Limit Proposals': liệt kê đề xuất (gộp từ endpoint proposal hoặc từ job nền nếu có).",  
        "Bulk Approve/Skip với lý do; ghi lại approvedByUserId."  
      \]  
    },  
    {  
      "route": "/dashboard",  
      "changes": \[  
        "Widget 'Re-baselining suggestions': cảnh báo khi đủ điều kiện (\>=N & đủ day span) nhưng chưa apply."  
      \]  
    }  
  \],  
  "telemetry\_logging": \[  
    "Log mỗi lần tính proposal (group keys, N, span, mean/sd/cv, số điểm bị loại).",  
    "Log apply (old vs new limits, approvedBy, time)."  
  \],  
  "testing": {  
    "unit": \[  
      "Hàm repository tính proposal loại bỏ đúng các violations trong EXCLUDE\_RULES\_FOR\_ESTIMATION.",  
      "Kiểm tra đủ N và MIN\_WORKING\_DAYS\_SPAN.",  
      "CV \= SD/Mean\*100 với bảo vệ chia 0."  
    \],  
    "integration": \[  
      "GET /api/qc/limits/proposal trả về eligible=false khi N\<20 hoặc span\<MIN\_WORKING\_DAYS\_SPAN.",  
      "POST /api/qc/limits/apply tạo/ghi limits với source='lab' và trả về bản mới.",  
      "LJ chart đổi giới hạn khi user đổi nguồn Limits."  
    \],  
    "e2e": \[  
      "Nhập thêm runs cho CREA để vượt ngưỡng N; proposal xuất hiện; apply; LJ vẽ lại; violations vẫn hoạt động."  
    \]  
  },  
  "edge\_cases": \[  
    "Thiếu qc\_limits hiện có (Manufacturer): LJ vẫn vẽ được với Observed nếu đã đủ N.",  
    "Value=0 hoặc mean=0 → cv không xác định: hiển thị null và cảnh báo.",  
    "Mix lot/device khác → tuyệt đối không gộp.",  
    "Outliers do maintenance/calibration: bị loại bởi rules; nếu vẫn lọt, winsorize 5% (tùy chọn nâng cao)."  
  \],  
  "security": \[  
    "Chỉ role QA/Director được Apply limits.",  
    "Log đầy đủ (who/when/what)."  
  \],  
  "rollout": \[  
    "Feature flag ROLLING\_LIMITS\_UI \+ ROLLING\_LIMITS\_ENGINE bật ở môi trường staging trước.",  
    "Seed thêm 5–10 runs để vượt N trong demo.",  
    "Đào tạo người dùng về sự khác biệt Manufacturer vs Observed."  
  \],  
  "tasks": \[  
    {  
      "id": "T1",  
      "title": "Repository function: computeRollingProposal",  
      "type": "backend",  
      "details": "Viết hàm Drizzle/SQL trả về {n, from, to, mean, sd, cv, eligible, reasons\[\]} theo tham số (testCode, level, lotCode, deviceCode, n).",  
      "done\_when": "Trả về dữ liệu chính xác trên dataset CREA seed; unit tests pass."  
    },  
    {  
      "id": "T2",  
      "title": "API: GET /api/qc/limits/proposal",  
      "type": "backend",  
      "details": "Wrap T1. Validate query; map z/z\_score; filter EXCLUDE\_RULES\_FOR\_ESTIMATION; enforce MIN\_WORKING\_DAYS\_SPAN.",  
      "depends\_on": \["T1"\],  
      "done\_when": "Contracts ổn định, integration tests pass."  
    },  
    {  
      "id": "T3",  
      "title": "API: POST /api/qc/limits/apply",  
      "type": "backend",  
      "details": "Viết upsert qc\_limits (source='lab'), không phụ thuộc UNIQUE: dùng WHERE NOT EXISTS \+ INSERT/UPDATE an toàn.",  
      "done\_when": "Apply thành công, lưu vết approvedByUserId (nếu có cột liên quan thì cập nhật; nếu không, log)."  
    },  
    {  
      "id": "T4",  
      "title": "LJ UI overlay selector \+ Drawer đề xuất",  
      "type": "frontend",  
      "details": "Thêm selector nguồn Limits và Drawer hiển thị so sánh Current vs Proposed với N/span; nút Apply gọi T3.",  
      "depends\_on": \["T2","T3"\],  
      "done\_when": "Người dùng đổi được nguồn Limits và apply proposal thành công; chart cập nhật ngay."  
    },  
    {  
      "id": "T5",  
      "title": "Dashboard widget: Re-baselining suggestions",  
      "type": "frontend",  
      "details": "Hiển thị list groups đủ điều kiện nhưng chưa apply; link tới /charts/lj với group đã chọn.",  
      "depends\_on": \["T2"\],  
      "done\_when": "Widget hiển thị đúng; navigation hoạt động."  
    },  
    {  
      "id": "T6",  
      "title": "Approval Inbox tab cho proposals",  
      "type": "frontend",  
      "details": "Thêm tab hiển thị các proposal (từ T2), cho bulk approve/skip với reason.",  
      "depends\_on": \["T2","T3"\],  
      "done\_when": "Bulk actions chạy được, có log."  
    },  
    {  
      "id": "T7",  
      "title": "Tests: unit/integration/e2e",  
      "type": "testing",  
      "details": "Phủ các trường hợp đủ/thiếu N, loại vi phạm, span ngày, apply & LJ overlay.",  
      "depends\_on": \["T1","T2","T3","T4"\]  
    }  
  \],  
  "acceptance\_criteria": \[  
    "Có thể tính proposal Rolling-N cho CREA (L1/L2) từ dữ liệu hiện có.",  
    "LJ chart chuyển đổi limits giữa Manufacturer | Observed (Rolling-N) | Cumulative-by-Lot.",  
    "Apply proposal tạo limits source='lab' và LJ phản ánh tức thì.",  
    "Không auto-apply; có log và (nếu có) approvedByUserId.",  
    "Tests pass (unit \+ integration tối thiểu cho T1–T4)."  
  \],  
  "non\_goals": \[  
    "Không triển khai Patient-based QC (PBRTQC) trong phạm vi này.",  
    "Không đồng bộ/exchange dữ liệu peer external."  
  \]  
}

### **4.2. Thảo luận về Workflow & UX/UI**

You said:  
Tôi chưa hiểu về workflow mới khi thêm tính năng tự động tính toán lại mean và SD, vẽ lại các đường giới hạn sau N (tuỳ người dùng chọn, thường là \>20) lần chạy QC, bạn giải thích workflow, UX/UI mới cho tôi hiểu đi, đảm bảo phải là best practices nhé  
ChatGPT said:  
Tuyệt—dưới đây là workflow \+ UX/UI chuẩn để triển khai “tự tính lại mean/SD sau N lần chạy” và tự vẽ lại giới hạn trên Levey–Jennings (LJ). Mình dựa theo khuyến cáo CLSI C24, CAP và tài liệu Westgard/Bio-Rad để bám best practices.

#### **Chi tiết Workflow (End-to-End)**

1. **Thu thập & gắn cờ**: Kỹ thuật viên nhập QC → hệ thống tính z, áp Westgard (1₍3s₎ reject, 1₍2s₎ warning, 2₍2s₎, R₍4s₎, 4₍1s₎, 10x…). Giới hạn mặc định vẽ theo mean ±3SD. (Nguồn: Westgard QC, Bio-Rad)  
2. **Bộ chọn dữ liệu để ước lượng**: Engine chỉ xét các điểm in-control: trạng thái “accepted” và không có vi phạm Westgard (khuyến cáo loại cả 1₍2s₎ để tránh phình SD). Điểm OOC vẫn lưu để audit nhưng loại khỏi tính toán, đúng tinh thần Westgard/CAP. (Nguồn: Westgard QC+1)  
3. **Điều kiện kích hoạt đề xuất (eligibility)**: Khi có ≥20 điểm hợp lệ (thường từ 20 ngày khác nhau) cho đúng tổ hợp (test × level × lot × device), engine tạo proposal limits “Observed (Rolling-N)”. Một số tài liệu chấp nhận ≥10 điểm khi khởi lập; nhưng thực hành phổ biến là ≥20 để ổn định SD hơn. (Nguồn: https://www.google.com/search?q=helpcenter.qcnet.com, Bio-Rad, Clinical Lab Products)  
4. **Tính toán Rolling-N**: Lấy N điểm gần nhất (mặc định N=20, cho phép người dùng đổi N≥20): tính mean, SD, CV; ghi khoảng thời gian bao phủ (from→to). Không trộn khác lot/device/method. (Nguồn: clsi.org)  
5. **So sánh & đề xuất**: Đối chiếu với limits hiện hành (manufacturer/peer hay lab cũ). Nếu lệch đáng kể hoặc người dùng chủ động bấm “Đề xuất”, hệ thống sinh proposal và gửi vào mục duyệt. (CAP/CLIA nhấn mạnh review định kỳ QC, không auto-áp.) (Nguồn: unityweb.qcnet.com)  
6. **Phê duyệt & Áp dụng (không tự động)**: Vai trò QA/Director xem proposal (N, khoảng ngày, mean/SD/CV mới, đồ thị 20 điểm), Approve → ghi version mới (source=lab, effective\_from), LJ ngay lập tức vẽ theo limits mới (vẫn có thể chuyển về Manufacturer/peer để so sánh). (Nguồn: clsi.org)  
7. **Theo dõi sau áp dụng**: Duy trì LJ ±1/±2/±3 SD, multi-rules; đánh giá hàng tháng là thông lệ kiểm định (CAP). Khi có lot change / major maintenance / recalibration, không gộp dữ liệu cũ vào Rolling-N của cấu hình mới. (Nguồn: unityweb.qcnet.com)

#### **Chi tiết UX/UI (Cụ thể, gọn tay người dùng)**

* **A) Charts → /charts/lj**  
  * **Limits source selector (segmented)**: Manufacturer/Peer | Observed (Rolling-N) | Cumulative-by-Lot. Trong “Observed”, hiển thị badge: N=20, from→to, mean/SD/CV; tooltips nhắc “OOC bị loại khỏi ước lượng”. (Nguồn: Bio-Rad, Westgard QC)  
  * **Action**: Nút “Đề xuất (Rolling-N)” → gọi engine; nếu eligible, mở Drawer cho QA với so sánh “Current vs Proposed” \+ sparkline 20 điểm.  
  * **Overlay**: Luôn vẽ ±1/±2/±3 SD và bật/tắt Westgard markers (1₍3s₎, 2₍2s₎, R₍4s₎, 4₍1s₎, 10x). (Nguồn: Westgard QC)  
  * **Empty state khi N\<20**: “Chưa đủ điểm để ước lượng Rolling-N (khuyến cáo ≥20)—dùng tạm Manufacturer/Peer.” (Nguồn: Bio-Rad)  
* **B) Inbox → /inbox/approval (Proposals)**  
  * **Danh sách proposal** theo (test × level × lot × device), cột: N, from→to, mean/SD/CV mới, mean/SD/CV hiện hành, % chênh, số điểm bị loại do rules.  
  * **Hành động**: Approve / Skip (reason). Sau approve: tạo/ghi limits (source=lab) và set effective\_from; lưu audit (ai/bao giờ). Không auto-apply. (Nguồn: unityweb.qcnet.com)  
* **C) Dashboard**  
  * **Widget “Re-baselining suggestions”**: Liệt kê nhóm đã đủ điều kiện (≥N, đủ span) nhưng chưa được áp dụng; bấm vào → deep-link tới /charts/lj với selector “Observed (Rolling-N)”.  
* **D) Config**  
  * Default N (20), ngưỡng ngày (ví dụ 10 ngày), rule loại trừ trong ước lượng (mặc định loại 1₍2s₎ trở lên). Giải thích ngắn lý do loại OOC khỏi tính toán. (Nguồn: Westgard QC+1)

#### **Tinh Chỉnh “Best Practice”**

* **Đừng auto-áp dụng limits mới**; luôn cần human review (phù hợp CAP: đánh giá QC định kỳ và tài liệu hóa). (Nguồn: unityweb.qcnet.com)  
* **N tối thiểu**: Chọn ≥20 là an toàn (CLSI/Bio-Rad); một số trường hợp ≥10 cho khởi lập, nhưng thay bằng dữ liệu nội bộ khi tích lũy đủ 20\. (Nguồn: https://www.google.com/search?q=helpcenter.qcnet.com, Bio-Rad)  
* **OOC handling**: Loại khỏi ước lượng nhưng không xóa (cần cho hồ sơ/điều tra), đúng khuyến cáo Westgard. (Nguồn: Westgard QC+1)  
* **Không trộn dữ liệu** khác lot/device/method khi tính Rolling-N; mỗi cấu hình có hành vi riêng (Bio-Rad cũng nhấn mạnh sai lệch giữa nhiều instrument). (Nguồn: Bio-Rad)  
* **LJ luôn ±3SD** (chuẩn) và dùng Westgard multirules để diễn giải; giao diện nên cho phép toggle các đường ±1/±2/±3 để giảm nhiễu thị giác khi cần. (Nguồn: Bio-Rad, Westgard QC)

#### **User Story (Role-based)**

1. **Tech** nhập QC → thấy LJ mặc định theo Manufacturer/Peer.  
2. Khi đạt **N=20 in-control**, banner trên chart gợi ý “Có đề xuất Rolling-N”.  
3. **QA** mở Drawer, xem N/from→to/mean-SD-CV/sparkline/số điểm loại do rules → Approve.  
4. Sau approve, LJ vẽ theo **Observed (Rolling-N)**; QA vẫn có thể switch lại “Manufacturer” để đối chiếu; hệ thống log đầy đủ để phục vụ đánh giá tháng/quý theo CAP. (Nguồn: unityweb.qcnet.com)

### **4.3. Prompt v2.0 \- Chi tiết hóa, bao phủ mọi ngữ cảnh**

You said:  
Bạn đóng gói tất cả những gì bạn mô tả một JSON prompt đi, đảm bảo ngữ cảnh được giữ nguyên và workflow mượt mà nhất, UX không rối rắm nhé, tôi sẽ dùng prompt này giao cho Agent thực thi tác vụ này. Vì đây là một cải tiến lớn nên cần phải thật sự kỹ lưỡng và chi tiết, đảm bảo bao phủ hết mọi ngữ cảnh, tech stack, schema, best practices theo khuyến cáo  
ChatGPT said:  
Dưới đây là JSON prompt đã đóng gói đầy đủ ngữ cảnh, workflow & UX/UI, cùng kế hoạch triển khai theo đúng stack của bạn (Next.js 14 \+ TS \+ Tailwind \+ Drizzle \+ Neon). Paste nguyên khối cho Agent để thực thi.

{  
  "title": "Rolling-N IQC Limits: Auto-Recalc Mean/SD \+ LJ Overlays \+ Approval Workflow",  
  "intent": "Triển khai engine tự tính lại mean/SD theo cửa sổ N điểm QC gần nhất (mặc định N=20, cho phép đổi N≥20), loại trừ điểm out-of-control theo Westgard, sinh proposal để QA duyệt (không auto-apply), và bổ sung UX/LJ overlays cho 3 nguồn giới hạn: Manufacturer/Peer | Observed (Rolling-N) | Cumulative-by-Lot.",  
  "context": {  
    "project": "C-Lab IQC Pro",  
    "stack": {  
      "frontend": "Next.js 14 (App Router) \+ TypeScript \+ Tailwind (shadcn/ui optional) \+ Recharts",  
      "backend": "Next.js Route Handlers \+ Drizzle ORM",  
      "db": "PostgreSQL (Neon), timezone Asia/Ho\_Chi\_Minh, decimal '.'"  
    },  
    "modules": \["/quick-entry", "/charts/lj", "/dashboard", "/inbox/approval", "/config/\*"\],  
    "iqc\_rules\_defaults": { "1\_3s": "reject", "1\_2s": "warning", "others": \["2\_2s","R\_4s","4\_1s","10x"\] },  
    "data\_model\_focus": "Không đổi schema lõi nếu không bắt buộc. Tính toán Rolling-N chủ yếu bằng truy vấn; proposal có thể không cần bảng riêng (dùng job/endpoint tính tức thời). Tuỳ chọn thêm bảng proposal để audit tốt hơn."  
  },  
  "assumptions": {  
    "single\_language": "vi",  
    "no\_realtime": true,  
    "index\_hint": "(analyte/test)\_id, level\_id, lot\_id, device\_id, run\_at",  
    "status\_values": \["accepted","rejected","review"\],  
    "z\_column\_name": "z OR z\_score (Agent phải tự phát hiện và map đúng)"  
  },  
  "parameters": {  
    "ROLLING\_N\_DEFAULT": 20,  
    "ROLLING\_N\_MIN": 20,  
    "MIN\_WORKING\_DAYS\_SPAN": 10,  
    "EXCLUDE\_RULES\_FOR\_ESTIMATION": \["1-3s","2-2s","R-4s","4-1s","10x","1-2s"\],  
    "STATUS\_INCLUDED\_FOR\_ESTIMATION": \["accepted"\],  
    "PROPOSAL\_APPLY\_NEEDS\_APPROVAL": true  
  },  
  "business\_rules": \[  
    "Tính riêng cho từng (test × level × lot × device); tuyệt đối không trộn lot/device/method.",  
    "Ước lượng chỉ dùng điểm in-control: status ∈ STATUS\_INCLUDED\_FOR\_ESTIMATION và không có violations thuộc EXCLUDE\_RULES\_FOR\_ESTIMATION.",  
    "Cửa sổ Rolling dùng N điểm mới nhất (N≥20). Nếu khoảng ngày phủ \< MIN\_WORKING\_DAYS\_SPAN hoặc N \< ROLLING\_N\_MIN thì chưa eligible.",  
    "Không auto-apply giới hạn mới; luôn cần QA/Director approve. Ghi version/effective\_from và audit.",  
    "Reset/khởi tạo lại khi đổi lot, major maintenance, recalibration, thay device/method.",  
    "LJ mặc định vẽ mean ±1/±2/±3 SD; cho phép toggle từng đường để giảm nhiễu."  
  \],  
  "workflow\_end\_to\_end": \[  
    "1) Nhập QC → hệ thống tính z, áp Westgard, gắn cờ; LJ hiển thị theo Manufacturer/Peer (hoặc lab limits hiện hành).",  
    "2) Engine chọn dữ liệu ước lượng: lọc accepted & không vi phạm rules đã chỉ định.",  
    "3) Khi đủ điều kiện (N≥20 và span≥MIN\_WORKING\_DAYS\_SPAN), cho phép tạo proposal Rolling-N cho đúng group (test×level×lot×device).",  
    "4) Tính mean, SD, CV cho N điểm; lưu kèm N và from→to.",  
    "5) So sánh với limits hiện hành; nếu chênh đáng kể hoặc người dùng bấm 'Đề xuất (Rolling-N)', sinh proposal (tức thời hoặc ghi bảng).",  
    "6) QA review trong /inbox/approval: xem N, span, mean/SD/CV cũ↔mới, sparkline 20 điểm, số điểm bị loại do rules → Approve/Skip (lý do).",  
    "7) Khi Approve, upsert limits (source='lab'), set effective\_from; LJ cập nhật ngay (user có thể switch giữa nguồn Limits).",  
    "8) Dashboard hiển thị Re-baselining suggestions nếu đủ điều kiện nhưng chưa apply; log & audit đầy đủ."  
  \],  
  "ux\_ui": {  
    "/charts/lj": {  
      "controls": \[  
        "Selector 'Limits': Manufacturer/Peer | Observed (Rolling-N) | Cumulative-by-Lot",  
        "Input N (min 20, default 20\) chỉ hiển thị khi chọn Observed (Rolling-N)",  
        "Badge chú thích: N, from→to, mean/SD/CV; tooltip: 'OOC bị loại khỏi ước lượng'",  
        "Nút 'Đề xuất (Rolling-N)' mở Drawer review cho QA"  
      \],  
      "overlays": \[  
        "Luôn có ±1/±2/±3 SD; toggle được",  
        "Hiển thị markers rule violations (1\_3s, 2\_2s, R\_4s, 4\_1s, 10x)"  
      \],  
      "empty\_states": \[  
        "Khi N \< 20 hoặc span \< MIN\_WORKING\_DAYS\_SPAN: hiển thị nhắc 'Chưa đủ dữ liệu để ước lượng Rolling-N — dùng tạm Manufacturer/Peer'"  
      \]  
    },  
    "/inbox/approval": {  
      "tab": "QC Limit Proposals",  
      "columns": \["test","level","lot","device","N","from→to","mean/SD/CV (current)","mean/SD/CV (proposed)","%Δmean","%ΔCV","\#excluded\_by\_rules","createdAt"\],  
      "actions": \["Approve","Skip(with reason)"\],  
      "bulk\_actions": true  
    },  
    "/dashboard": {  
      "widgets": \["Re-baselining suggestions (deep-link tới /charts/lj với group đã chọn)"\]  
    },  
    "/config/system": {  
      "fields": \[  
        "Default N (\>=20)",  
        "MIN\_WORKING\_DAYS\_SPAN (mặc định 10)",  
        "Danh sách rules loại trừ khi ước lượng (mặc định: 1-2s trở lên)"  
      \]  
    }  
  },  
  "api\_contracts": \[  
    {  
      "method": "GET",  
      "path": "/api/qc/limits/proposal",  
      "query": "testCode, level, lotCode, deviceCode, n? (default 20)",  
      "response\_example": {  
        "ok": true,  
        "group": {"testCode":"CREA","level":"L1","lotCode":"CTRL-2025A","deviceCode":"C311"},  
        "window": {"n": 20, "from": "2025-08-10T08:00:00+07:00", "to": "2025-09-07T10:00:00+07:00"},  
        "stats": {"mean": 89.97, "sd": 5.12, "cv": 5.69},  
        "currentLimits": {"mean": 90.00, "sd": 5.00, "cv": 5.56, "source": "manufacturer"},  
        "eligible": true,  
        "reasons": \[\],  
        "excludedCount": 2  
      }  
    },  
    {  
      "method": "POST",  
      "path": "/api/qc/limits/apply",  
      "body": {  
        "testCode": "CREA",  
        "level": "L1",  
        "lotCode": "CTRL-2025A",  
        "deviceCode": "C311",  
        "rollingN": 20,  
        "mean": 89.97,  
        "sd": 5.12,  
        "cv": 5.69,  
        "source": "lab",  
        "approvedByUserId": "\<uuid\>"  
      },  
      "behavior": "Upsert limits (source='lab'), set effective\_from=now(), lưu audit. Không xóa/ghi đè lịch sử cũ."  
    },  
    {  
      "method": "GET",  
      "path": "/api/qc/limits/history",  
      "query": "testCode, level, lotCode, deviceCode",  
      "behavior": "Trả về lịch sử limits theo thời gian (manufacturer/lab) để overlay trên LJ nếu cần."  
    }  
  \],  
  "algorithms\_sql": {  
    "proposal\_query\_psql": "WITH grp AS ( SELECT t.id AS test\_id, l.id AS level\_id, ql.id AS lot\_id, d.id AS device\_id FROM tests t JOIN qc\_levels l ON l.test\_id=t.id AND l.level=$1 JOIN qc\_lots ql ON ql.level\_id=l.id AND ql.lot\_code=$2 JOIN devices d ON d.code=$3 WHERE t.code=$4 ), lastN AS ( SELECT r.value, COALESCE(r.run\_at, r.created\_at) AS run\_at, r.id AS run\_id FROM qc\_runs r, grp g WHERE r.test\_id=g.test\_id AND r.level\_id=g.level\_id AND r.lot\_id=g.lot\_id AND r.device\_id=g.device\_id AND r.status=ANY($5) AND NOT EXISTS ( SELECT 1 FROM violations v WHERE v.run\_id=r.id AND v.rule\_code \= ANY ($6) ) ORDER BY run\_at DESC LIMIT $7 ), span AS ( SELECT MIN(run\_at) AS from\_at, MAX(run\_at) AS to\_at, COUNT(\*) AS n FROM lastN ), calc AS ( SELECT AVG(value)::numeric(12,4) AS mean, STDDEV\_SAMP(value)::numeric(12,4) AS sd, (STDDEV\_SAMP(value)/NULLIF(AVG(value),0)\*100)::numeric(6,2) AS cv FROM lastN ) SELECT n, from\_at, to\_at, mean, sd, cv FROM span, calc;",  
    "apply\_limits\_upsert\_psql": "/\* Không giả định UNIQUE. Dùng WHERE NOT EXISTS để INSERT, nếu đã tồn tại thì UPDATE theo (test\_id, level\_id, lot\_id, device\_id). Bảo toàn lịch sử: tuỳ chọn 'effective\_to' nếu schema hỗ trợ versioning. \*/",  
    "robust\_options": \[  
      "Winsorize 5% nếu N nhỏ (\>=20 & \<40) để chống outlier kéo SD.",  
      "Không áp dụng robust nếu N≥40; dùng mean & stddev\_samp chuẩn."  
    \]  
  },  
  "optional\_schema\_additions": {  
    "qc\_limit\_proposals": {  
      "create": false,  
      "note": "Tuỳ chọn. Nếu cần audit sâu, tạo bảng proposals với: id, test\_id, level\_id, lot\_id, device\_id, n, from\_at, to\_at, mean, sd, cv, excluded\_count, reasons jsonb, created\_by, approved\_by, approved\_at, status('pending'|'approved'|'skipped'), created\_at."  
    }  
  },  
  "security\_audit\_logging": \[  
    "Role QA/Director mới được POST /api/qc/limits/apply.",  
    "Log proposal compute (group keys, N, span, mean/sd/cv, excludedCount).",  
    "Log apply (old vs new limits, approvedByUserId, timestamp)."  
  \],  
  "testing": {  
    "unit": \[  
      "Lọc đúng accepted & loại đúng violations thuộc EXCLUDE\_RULES\_FOR\_ESTIMATION.",  
      "Đủ/thiếu N và kiểm tra MIN\_WORKING\_DAYS\_SPAN.",  
      "CV tính đúng \= SD/Mean\*100 với bảo vệ chia 0."  
    \],  
    "integration": \[  
      "GET /proposal trả eligible=false khi N\<20 hoặc span\<MIN\_WORKING\_DAYS\_SPAN.",  
      "POST /apply tạo/ghi limits (source='lab'), trả về bản mới và có log.",  
      "LJ overlay đổi đúng giữa 3 nguồn Limits."  
    \],  
    "e2e": \[  
      "Seed thêm dữ liệu để vượt N; xuất hiện proposal; QA approve; LJ cập nhật; multi-rules vẫn hoạt động."  
    \]  
  },  
  "rollout": \[  
    "Bật feature flags: ROLLING\_LIMITS\_ENGINE, ROLLING\_LIMITS\_UI (staging → production).",  
    "Hướng dẫn người dùng về khác biệt Manufacturer/Peer vs Observed (Rolling-N).",  
    "Thiết lập cron/job đêm để tính proposal tự động (tùy chọn) hoặc on-demand."  
  \],  
  "edge\_cases": \[  
    "Thiếu limits Manufacturer/Peer: vẫn hiển thị Observed nếu đủ N.",  
    "Mean\~0 → CV không xác định: hiển thị null & cảnh báo.",  
    "Run bị outlier do bảo trì: đa số đã bị loại nhờ rules; nếu vẫn lọt, cân nhắc winsorize 5% (tuỳ chọn).",  
    "Nhiều lot/devices: tuyệt đối không gộp vào một proposal."  
  \],  
  "acceptance\_criteria": \[  
    "Proposals Rolling-N tạo được cho các group đủ điều kiện.",  
    "QA approve sinh limits source='lab' và LJ phản ánh ngay.",  
    "Người dùng có thể switch giữa Manufacturer/Peer | Observed (Rolling-N) | Cumulative-by-Lot.",  
    "Không auto-apply; có logging/audit đầy đủ; tests pass tối thiểu cho T1–T4."  
  \],  
  "tasks": \[  
    { "id": "T1", "title": "ComputeRollingProposal (repo/service)", "type": "backend", "details": "Drizzle \+ SQL theo proposal\_query\_psql; tham số (testCode, level, lotCode, deviceCode, n). Trả {eligible, reasons, n, from, to, mean, sd, cv, excludedCount}." },  
    { "id": "T2", "title": "GET /api/qc/limits/proposal", "type": "backend", "depends\_on": \["T1"\], "details": "Validate query; map z vs z\_score; implement MIN\_WORKING\_DAYS\_SPAN; trả currentLimits (nếu có) để so sánh." },  
    { "id": "T3", "title": "POST /api/qc/limits/apply", "type": "backend", "details": "Upsert limits (source='lab'), set effective\_from, log approvedByUserId. Không yêu cầu UNIQUE index." },  
    { "id": "T4", "title": "LJ UI overlays \+ Drawer Proposals", "type": "frontend", "depends\_on": \["T2","T3"\], "details": "Selector nguồn Limits, input N, Drawer so sánh Current vs Proposed, Apply → refetch chart." },  
    { "id": "T5", "title": "Inbox Proposals", "type": "frontend", "depends\_on": \["T2","T3"\], "details": "Tab hiển thị proposals (tính on-demand hoặc từ job), Bulk Approve/Skip (reason)." },  
    { "id": "T6", "title": "Dashboard widget", "type": "frontend", "depends\_on": \["T2"\], "details": "Re-baselining suggestions với deep-link /charts/lj." },  
    { "id": "T7", "title": "Job (optional)", "type": "backend", "details": "Nightly scan groups để gợi ý proposal; ghi log. Có thể bỏ nếu chỉ on-demand." },  
    { "id": "T8", "title": "Tests: unit/integration/e2e", "type": "testing", "depends\_on": \["T1","T2","T3","T4"\] }  
  \],  
  "non\_goals": \[  
    "Không triển khai PBRTQC trong scope này (chỉ nêu như hướng mở).",  
    "Không đồng bộ peer external."  
  \]  
}

#### **Nguồn tham khảo chính (Best Practices)**

* Quy tắc ngón tay cái ≥20 đo qua ≥10 ngày làm việc (tốt nhất ≥4 tuần) để ước lượng SD ổn định; thu thập thêm giúp SD không bị ước lượng thấp. (Nguồn: Westgard QC)  
* Khởi lập mean/SD từ ≥20 điểm theo CLSI C24; giá trị hãng/peer chỉ là tham chiếu tạm, cần thay bằng dữ liệu nội bộ khi đủ điểm. (Nguồn: QCNet Help Center, Bio-Rad)  
* LJ vẽ ±1/±2/±3 SD; quy tắc 1₂s thường chỉ dùng cảnh báo do \~5% điểm sẽ rơi ngoài ±2SD ngay cả khi hệ thống ổn. (Nguồn: Bio-Rad, SPC for Excel)  
* Không auto-apply; QC plan cần review/approve theo CAP/CLIA/IQCP; sử dụng lịch sử và rủi ro để xác định tần suất/quy trình kiểm soát. (Nguồn: Documents Cloud, Westgard QC)  
* (Hướng mở) PBRTQC/moving average là bổ trợ hiện đại, cần hiệu chỉnh tham số theo từng labo, không thay thế IQC truyền thống. (Nguồn: PubMed, PMC)

### **4.4. Prompt v3.0 \- Hỗ trợ Lưu trữ & Audit (Audit-Ready)**

You said:  
Tôi muốn lưu trữ các đề xuất để audit sau này đấy  
ChatGPT said:  
Tuyệt — để lưu trữ proposals phục vụ audit (CAP/CLIA yêu cầu kiểm soát tài liệu/hồ sơ, có phê duyệt, phiên bản và lưu giữ), mình đóng gói lại thành JSON prompt cho Agent, bổ sung hẳn bảng qc\_limit\_proposals \+ workflow duyệt/áp dụng, log/audit & retention. Tài liệu CAP (Nguồn: Documents Cloud, CMS, eCFR)  
Ngoài ra, multirules & giới hạn L-J vẫn theo Westgard/CLSI; 1₂s là cảnh báo, không đặt làm từ chối; Rolling-N tối thiểu ≥20 điểm in-control. (Nguồn: Westgard QC+2, Westgard QC+2, webstore.ansi.org)  
Dán nguyên khối JSON dưới đây cho Agent:

{  
  "title": "Persisted QC Limit Proposals (Audit-Ready): Rolling-N Engine \+ LJ Overlays \+ Approval & Versioning",  
  "intent": "Thêm bảng lưu trữ proposals (audit trail), quy trình duyệt/áp dụng giới hạn IQC dựa trên Rolling-N (\>=20 điểm in-control), cập nhật LJ overlays, và logging/retention theo CAP/CLIA.",  
  "context": {  
    "project": "C-Lab IQC Pro",  
    "stack": {  
      "frontend": "Next.js 14 (App Router) \+ TypeScript \+ Tailwind (shadcn/ui optional) \+ Recharts",  
      "backend": "Next.js Route Handlers \+ Drizzle ORM",  
      "db": "PostgreSQL (Neon); timezone: Asia/Ho\_Chi\_Minh; decimal: '.'"  
    },  
    "modules": \["/quick-entry", "/charts/lj", "/dashboard", "/inbox/approval", "/config/\*"\],  
    "rules\_defaults": { "1\_3s": "reject", "1\_2s": "warning", "others": \["2\_2s","R\_4s","4\_1s","10x"\] },  
    "z\_column\_name\_note": "Schema hiện hữu có thể dùng 'z' hoặc 'z\_score' – auto-detect & map trong repo."  
  },  
  "parameters": {  
    "ROLLING\_N\_DEFAULT": 20,  
    "ROLLING\_N\_MIN": 20,  
    "MIN\_WORKING\_DAYS\_SPAN": 10,  
    "EXCLUDE\_RULES\_FOR\_ESTIMATION": \["1-3s","2-2s","R-4s","4-1s","10x","1-2s"\],  
    "STATUS\_INCLUDED\_FOR\_ESTIMATION": \["accepted"\],  
    "PROPOSAL\_APPLY\_NEEDS\_APPROVAL": true,  
    "RETENTION\_YEARS": 2,  
    "RETENTION\_NOTE": "Điều chỉnh theo quy định địa phương/đơn vị; tối thiểu lưu đủ để đáp ứng CAP/CLIA audit."  
  },  
  "business\_rules": \[  
    "Tính riêng cho từng (test × level × lot × device). Không trộn lot/device/method.",  
    "Ước lượng dùng điểm in-control: status ∈ STATUS\_INCLUDED\_FOR\_ESTIMATION và không có violations ∈ EXCLUDE\_RULES\_FOR\_ESTIMATION.",  
    "Cửa sổ Rolling dùng N điểm mới nhất (N≥20). Nếu span \< MIN\_WORKING\_DAYS\_SPAN hoặc N \< ROLLING\_N\_MIN → ineligible.",  
    "Không auto-apply; QA/Director phải approve. Lưu dấu vết (who/when/what) và versioning.",  
    "Reset điều kiện khi đổi lot, calibration lớn, major maintenance, thay device/method.",  
    "LJ hiển thị ±1/±2/±3 SD; 1\_2s là cảnh báo, không tự động reject."  
  },  
  "data\_model\_changes": {  
    "create\_tables": \[  
      {  
        "name": "qc\_limit\_proposals",  
        "sql": "CREATE TABLE IF NOT EXISTS qc\_limit\_proposals (id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(), test\_id UUID NOT NULL, level\_id UUID NOT NULL, lot\_id UUID NOT NULL, device\_id UUID NOT NULL, rolling\_n INT NOT NULL, window\_from TIMESTAMPTZ NOT NULL, window\_to TIMESTAMPTZ NOT NULL, mean NUMERIC(12,4) NOT NULL, sd NUMERIC(12,4) NOT NULL, cv NUMERIC(6,2) NOT NULL, excluded\_count INT NOT NULL DEFAULT 0, excluded\_rules TEXT\[\] NOT NULL DEFAULT '{}', reasons JSONB NOT NULL DEFAULT '\[\]'::jsonb, notes TEXT, status TEXT NOT NULL CHECK (status IN ('pending','approved','skipped')) DEFAULT 'pending', created\_by UUID, created\_at TIMESTAMPTZ NOT NULL DEFAULT now(), approved\_by UUID, approved\_at TIMESTAMPTZ, applied\_limit\_id UUID, CONSTRAINT fk\_test FOREIGN KEY (test\_id) REFERENCES tests(id) ON DELETE CASCADE, CONSTRAINT fk\_level FOREIGN KEY (level\_id) REFERENCES qc\_levels(id) ON DELETE CASCADE, CONSTRAINT fk\_lot FOREIGN KEY (lot\_id) REFERENCES qc\_lots(id) ON DELETE CASCADE, CONSTRAINT fk\_device FOREIGN KEY (device\_id) REFERENCES devices(id) ON DELETE CASCADE );",  
        "indexes": \[  
          "CREATE INDEX IF NOT EXISTS idx\_qclp\_group ON qc\_limit\_proposals(test\_id, level\_id, lot\_id, device\_id, created\_at DESC);",  
          "CREATE INDEX IF NOT EXISTS idx\_qclp\_status ON qc\_limit\_proposals(status);"  
        \],  
        "drizzle\_ts": "export const qcLimitProposals \= pgTable('qc\_limit\_proposals',{ id: uuid('id').primaryKey().defaultRandom(), testId: uuid('test\_id').notNull(), levelId: uuid('level\_id').notNull(), lotId: uuid('lot\_id').notNull(), deviceId: uuid('device\_id').notNull(), rollingN: integer('rolling\_n').notNull(), windowFrom: timestamp('window\_from',{withTimezone:true}).notNull(), windowTo: timestamp('window\_to',{withTimezone:true}).notNull(), mean: numeric('mean',{precision:12,scale:4}).notNull(), sd: numeric('sd',{precision:12,scale:4}).notNull(), cv: numeric('cv',{precision:6,scale:2}).notNull(), excludedCount: integer('excluded\_count').default(0).notNull(), excludedRules: text('excluded\_rules').array().notNull().default(sql\`'{}'::text\[\]\`), reasons: jsonb('reasons').notNull().default(sql\`'\[\]'::jsonb\`), notes: text('notes'), status: text('status',{enum: \['pending','approved','skipped'\]}).notNull().default('pending'), createdBy: uuid('created\_by'), createdAt: timestamp('created\_at',{withTimezone:true}).notNull().defaultNow(), approvedBy: uuid('approved\_by'), approvedAt: timestamp('approved\_at',{withTimezone:true}), appliedLimitId: uuid('applied\_limit\_id') });"  
      }  
    \],  
    "no\_unique\_required\_note": "Tránh phụ thuộc ON CONFLICT nhiều cột. Dùng WHERE NOT EXISTS để upsert."  
  },  
  "algorithms\_sql": {  
    "compute\_proposal\_psql": "WITH grp AS ( SELECT t.id AS test\_id, l.id AS level\_id, ql.id AS lot\_id, d.id AS device\_id FROM tests t JOIN qc\_levels l ON l.test\_id=t.id AND l.level=$1 JOIN qc\_lots ql ON ql.level\_id=l.id AND ql.lot\_code=$2 JOIN devices d ON d.code=$3 WHERE t.code=$4 ), lastN AS ( SELECT r.value, COALESCE(r.run\_at, r.created\_at) AS run\_at, r.id AS run\_id FROM qc\_runs r, grp g WHERE r.test\_id=g.test\_id AND r.level\_id=g.level\_id AND r.lot\_id=g.lot\_id AND r.device\_id=g.device\_id AND r.status \= ANY($5) AND NOT EXISTS ( SELECT 1 FROM violations v WHERE v.run\_id=r.id AND v.rule\_code \= ANY ($6) ) ORDER BY run\_at DESC LIMIT $7 ), span AS ( SELECT MIN(run\_at) AS from\_at, MAX(run\_at) AS to\_at, COUNT(\*) AS n FROM lastN ), calc AS ( SELECT AVG(value)::numeric(12,4) AS mean, STDDEV\_SAMP(value)::numeric(12,4) AS sd, (STDDEV\_SAMP(value)/NULLIF(AVG(value),0)\*100)::numeric(6,2) AS cv FROM lastN ) SELECT n, from\_at, to\_at, mean, sd, cv FROM span, calc;",  
    "insert\_proposal\_psql": "INSERT INTO qc\_limit\_proposals(test\_id, level\_id, lot\_id, device\_id, rolling\_n, window\_from, window\_to, mean, sd, cv, excluded\_count, excluded\_rules, reasons, notes, status, created\_by) SELECT g.test\_id, g.level\_id, g.lot\_id, g.device\_id, $7, p.from\_at, p.to\_at, p.mean, p.sd, p.cv, $8, $6, to\_jsonb($9::text\[\]), $10, 'pending', $11 FROM grp g, (SELECT \* FROM (VALUES ( (SELECT n FROM (SELECT \* FROM (SELECT 1\) x) y) )) v(n)) dummy, (SELECT \* FROM (SELECT $4) z(code)), LATERAL (SELECT \* FROM (SELECT (SELECT from\_at, to\_at, mean, sd, cv FROM (SELECT \* FROM (SELECT 1\) t) s )) k) hack, (SELECT \* FROM (SELECT (SELECT \* FROM (SELECT 1\) t)) s2) hack2;",  
    "apply\_limits\_psql\_note": "Khi approve, INSERT (nếu chưa có) hoặc UPDATE bản ghi qc\_limits tương ứng (source='lab', effective\_from=now()), sau đó UPDATE qc\_limit\_proposals SET status='approved', approved\_by=$userId, approved\_at=now(), applied\_limit\_id=\<id qc\_limits\>."  
  },  
  "api\_contracts": \[  
    {  
      "method": "POST",  
      "path": "/api/qc/limits/proposals",  
      "body": { "testCode": "CREA", "level": "L1", "lotCode": "CTRL-2025A", "deviceCode": "C311", "n": 20, "excludeRules": \["1-3s","2-2s","R-4s","4-1s","10x","1-2s"\], "notes": "Đề xuất theo Rolling-20", "createdBy": "\<uuid\>" },  
      "behavior": "Tính Rolling-N → chèn bản ghi vào qc\_limit\_proposals (status='pending'). Trả về proposal vừa tạo."  
    },  
    {  
      "method": "GET",  
      "path": "/api/qc/limits/proposals",  
      "query": "status?=pending|approved|skipped, testCode?, level?, lotCode?, deviceCode?, from?, to?, page?, pageSize?",  
      "behavior": "Liệt kê proposals (phục vụ /inbox/approval & dashboard)."  
    },  
    {  
      "method": "POST",  
      "path": "/api/qc/limits/proposals/:id/approve",  
      "body": { "approvedByUserId": "\<uuid\>" },  
      "behavior": "Upsert qc\_limits (source='lab'), set effective\_from=now(); cập nhật proposal status='approved', approved\_by/at, applied\_limit\_id."  
    },  
    {  
      "method": "POST",  
      "path": "/api/qc/limits/proposals/:id/skip",  
      "body": { "reason": "text" },  
      "behavior": "Đặt status='skipped', lưu reason vào reasons\[\]."  
    }  
  \],  
  "ux\_ui": {  
    "/charts/lj": {  
      "controls": \["Selector Limits: Manufacturer/Peer | Observed (Rolling-N) | Cumulative-by-Lot", "Input N (\>=20) khi chọn Observed", "Badge: N, from→to, mean/SD/CV", "Action: 'Tạo đề xuất (Rolling-N)'"\],  
      "overlays": \["±1/±2/±3 SD (toggle)", "Markers Westgard"\],  
      "empty\_states": \["N\<20 hoặc span\<MIN\_WORKING\_DAYS\_SPAN → khuyến cáo dùng Manufacturer/Peer trước"\]  
    },  
    "/inbox/approval": {  
      "tab": "QC Limit Proposals",  
      "columns": \["test","level","lot","device","N","from→to","mean/SD/CV (current)","mean/SD/CV (proposed)","%Δmean","%ΔCV","\#excluded\_by\_rules","createdAt","createdBy"\],  
      "actions": \["Approve","Skip(with reason)"\],  
      "bulk\_actions": true  
    },  
    "/dashboard": {  
      "widgets": \["Re-baselining suggestions (nhóm đủ điều kiện nhưng chưa approved)"\]  
    },  
    "/config/system": {  
      "fields": \["Default N (\>=20)","MIN\_WORKING\_DAYS\_SPAN (\>=10)","Danh sách rules loại trừ khi ước lượng"\]  
    }  
  },  
  "security\_audit": \[  
    "Role QA/Director mới được approve.",  
    "Log compute proposal (group keys, N, span, mean/sd/cv, excludedCount).",  
    "Log approve (old vs new limits, approvedBy, timestamp, applied\_limit\_id).",  
    "Retention: lưu proposals \>= RETENTION\_YEARS; cung cấp export CSV/PDF khi audit."  
  \],  
  "testing": {  
    "unit": \[  
      "Lọc đúng accepted & loại đúng violations.",  
      "Eligible=false khi N\<20 hoặc span\<MIN\_WORKING\_DAYS\_SPAN.",  
      "CV \= SD/Mean\*100 (guard chia 0)."  
    \],  
    "integration": \[  
      "POST /proposals tạo bản ghi 'pending'.",  
      "POST /proposals/:id/approve sinh/ghi qc\_limits, cập nhật proposal.",  
      "LJ overlay đổi đúng sau approve."  
    \],  
    "e2e": \[  
      "Seed thêm để vượt N; tạo proposal; approve; LJ cập nhật; audit log đầy đủ."  
    \]  
  },  
  "rollout": \[  
    "Bật flags: ROLLING\_LIMITS\_ENGINE, ROLLING\_LIMITS\_UI, ROLLING\_LIMITS\_PROPOSALS.",  
    "Staging trước, sản xuất sau; hướng dẫn người dùng khác biệt Manufacturer/Peer vs Observed."  
  \],  
  "acceptance\_criteria": \[  
    "Proposals được lưu và truy vết đầy đủ (status, who/when/what).",  
    "Approve tạo/ghi qc\_limits (source='lab') và liên kết applied\_limit\_id.",  
    "LJ switch giữa Manufacturer/Peer | Observed (Rolling-N) | Cumulative-by-Lot mượt mà.",  
    "Audit/export khả dụng; tests pass T1–T4 tối thiểu."  
  \],  
  "tasks": \[  
    { "id": "M1", "title": "Migration: qc\_limit\_proposals \+ indexes", "type": "db", "details": "Tạo bảng & index như trên (Neon). Không phụ thuộc UNIQUE đa cột." },  
    { "id": "B1", "title": "Repo: computeRollingProposal()", "type": "backend", "details": "SQL compute\_proposal\_psql; params (testCode, level, lotCode, deviceCode, n). Trả {eligible, reasons, n, from, to, mean, sd, cv, excludedCount}." },  
    { "id": "B2", "title": "API: POST /api/qc/limits/proposals", "type": "backend", "depends\_on": \["B1","M1"\] },  
    { "id": "B3", "title": "API: GET /api/qc/limits/proposals", "type": "backend", "depends\_on": \["M1"\] },  
    { "id": "B4", "title": "API: POST /api/qc/limits/proposals/:id/approve", "type": "backend", "depends\_on": \["M1"\] },  
    { "id": "B5", "title": "API: POST /api/qc/limits/proposals/:id/skip", "type": "backend", "depends\_on": \["M1"\] },  
    { "id": "F1", "title": "LJ UI: selector & Drawer đề xuất", "type": "frontend", "depends\_on": \["B2","B4"\] },  
    { "id": "F2", "title": "Inbox tab: Proposals", "type": "frontend", "depends\_on": \["B3","B4","B5"\] },  
    { "id": "F3", "title": "Dashboard: Re-baselining suggestions", "type": "frontend", "depends\_on": \["B3"\] },  
    { "id": "TST", "title": "Tests (unit+integration+e2e)", "type": "testing", "depends\_on": \["B1","B2","B3","B4","F1"\] }  
  \]  
}

#### **Ghi chú nguồn (Best Practices)**

* Westgard multirules & 1₂s là cảnh báo; LJ ±3SD; đừng dùng ±2SD làm giới hạn chấp nhận mặc định. (Nguồn: Westgard QC+1)  
* Rolling khởi lập/điều chỉnh thường dựa ≥20 điểm in-control; theo CLSI C24 và thực hành phổ biến. (Nguồn: webstore.ansi.org, Westgard QC)  
* CAP/CLIA yêu cầu document control & records: phê duyệt, version, lưu giữ & khả năng truy xuất (audit). (Nguồn: Tài liệu CAP, Documents Cloud, CMS, eCFR)

## **5\. Nguồn Tài Liệu Tham Khảo**

Đây là danh sách tổng hợp các nguồn đã được trích dẫn trong tài liệu này:

* **Westgard QC**:  
  * [Westgard Rules Basics](https://www.westgard.com/westgard-rules.html)  
  * [Common Questions about Westgard Rules](https://www.westgard.com/questions/quest13.html)  
* **Bio-Rad Laboratories**: Nhà cung cấp vật liệu và phần mềm QC, tài liệu của họ là nguồn tham khảo phổ biến cho các best practices.  
* **CAP (College of American Pathologists)**:  
  * [documents.cap.org](https://www.google.com/search?q=https://documents.cap.org): Nơi chứa các checklist và tiêu chuẩn kiểm định.  
  * [Tài liệu CAP, Documents Cloud](https://www.google.com/search?q=cap.org+document+control): Các yêu cầu về kiểm soát và lưu trữ hồ sơ.  
* **CLSI (Clinical and Laboratory Standards Institute)**:  
  * [webstore.ansi.org](https://webstore.ansi.org): Nơi công bố các tiêu chuẩn như CLSI C24.  
  * [clsi.org](https://clsi.org): Trang chủ chính thức.  
* **Quy định liên bang Hoa Kỳ**:  
  * **eCFR (Electronic Code of Federal Regulations)**: Các quy định của CLIA.  
  * **CMS (Centers for Medicare & Medicaid Services)**: Cơ quan quản lý CLIA.  
* **Nhà cung cấp khác**:  
  * [Horiba ABX Toolkits](https://www.google.com/search?q=toolkits.horiba-abx.com)  
  * [Roche Diagnostics eLabDoc](https://www.google.com/search?q=elabdoc-prod.roche.com)  
* **Cổng thông tin và tạp chí**:  
  * [captodayonline.com](https://www.captodayonline.com): Tạp chí của CAP.  
  * [iacld.com (International Academy of Clinical and Laboratory Doctors)](https://www.google.com/search?q=iacld.com)  
  * [unityweb.qcnet.com](https://www.google.com/search?q=unityweb.qcnet.com): Phần mềm QC của Bio-Rad.  
  * [helpcenter.qcnet.com](https://www.google.com/search?q=helpcenter.qcnet.com): Trung tâm trợ giúp của QCNet.  
  * [Clinical Lab Products](https://www.google.com/search?q=Clinical+Lab+Products+magazine): Tạp chí chuyên ngành.  
  * [SPC for Excel](https://www.google.com/search?q=spcforexcel.com): Cung cấp kiến thức về kiểm soát quy trình thống kê.  
* **Hệ thống quản lý tài liệu**:  
  * [PowerDMS](https://www.google.com/search?q=PowerDMS): Phần mềm quản lý chính sách và tuân thủ.  
* **Nghiên cứu khoa học**:  
  * [PubMed](https://pubmed.ncbi.nlm.nih.gov/): Cơ sở dữ liệu các bài báo y sinh.  
  * [PMC (PubMed Central)](https://www.ncbi.nlm.nih.gov/pmc/): Lưu trữ toàn văn các bài báo.