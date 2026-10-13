[GitHub Pages로 아이폰에서 사용하기]
1) GitHub 저장소(Paint-Quantity-Calculat)에 이 폴더 안의 파일을 "그대로" 올립니다.
   (index.html, sw.js, manifest.json, icon-192.png, icon-512.png, icon-180.png, icon-maskable-512.png, .nojekyll)
   ※ PQC 폴더째 올리지 말고 폴더 안의 파일들이 저장소 맨 위(루트)에 오도록 올리세요.
2) Settings > Pages > Branch: main / (root) 저장
3) 아이폰 사파리에서 https://only12you.github.io/Paint-Quantity-Calculat/ 접속
4) 공유 버튼 > 홈 화면에 추가 → 앱처럼 사용
※ TDS(PDF)·엑셀·OCR·이미지 저장은 처음 한 번 인터넷이 필요합니다.
※ 업데이트 후 옛 화면이 보이면 홈 화면 앱을 완전히 종료했다가 다시 실행하세요.

※ 앱 아이콘: 기본은 파란색 PQC V2 아이콘입니다. 초록색을 쓰려면 icons_alt_green 폴더의 icon-*.png 4개를 루트의 같은 이름 파일에 덮어쓰세요(icons_alt_green 폴더 자체는 올리지 않아도 됩니다).
※ 홈 화면 아이콘은 이미 설치한 경우 바뀌지 않으니, 홈 화면 앱을 삭제하고 다시 추가하세요.

[v351 추가] 재도장 진단 · LCC 모듈
- 홈 화면 버튼 또는 더보기 > "재도장 진단 · LCC"에서 열립니다.
- 입력값은 이 기기에 저장되며(키: pqu:rp), 더보기 > 백업·복원의 JSON 백업에 함께 들어갑니다.
- 사양 코트의 "DB 제품 선택"으로 제품 DB의 고형분·추천도막·희석율·포장을 불러오고, "추천사양 → 일위대가표"로 계산 페이지에 보낼 수 있습니다.
- 모듈 전체가 index.html 안에 들어 있어 오프라인에서 동작합니다(AI 사진 판독은 제외).

[v352] 견적서(·일위대가표/도장 시스템 보고서) 도장 사양 표에 로스(%)·희석율(%) 열 추가
