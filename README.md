# GitHub Pages 그래프 비교 페이지

두 CSV 파일을 브라우저에서 불러와 선 그래프를 겹쳐 비교하고, A-B 차이와 기본 통계를 확인하는 정적 웹페이지입니다.

## 주요 기능

- CSV 파일 2개 비교
- X축과 Y축 열 선택
- A/B 중첩 선 그래프
- A-B 차이 그래프
- 평균 및 최대 절대 차이 표시
- 확대, 이동, 범례 표시/숨김
- 그래프 PNG 저장
- 데이터 검색 및 표 확인
- 다크 모드
- 서버 업로드 없이 브라우저 내부에서 데이터 처리

## CSV 예시

```csv
time,value
0,10.2
1,10.5
2,11.1
```

두 파일에서 X축 열 이름은 같게 만드는 것을 권장합니다.

## 로컬 실행

`index.html`을 직접 열어도 되지만, 브라우저 보안 정책에 따라 간단한 로컬 서버를 사용할 수 있습니다.

```bash
python -m http.server 8000
```

이후 브라우저에서 `http://localhost:8000`에 접속합니다.

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만듭니다.
2. `index.html`, `style.css`, `app.js`를 저장소 최상위 폴더에 올립니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Build and deployment → Source**를 `Deploy from a branch`로 설정합니다.
5. Branch는 `main`, 폴더는 `/(root)`를 선택하고 저장합니다.
6. 잠시 후 Pages 화면에 표시되는 주소로 접속합니다.

## 참고

Chart.js, chartjs-plugin-zoom, Papa Parse를 CDN으로 불러오기 때문에 페이지 조회 시 인터넷 연결이 필요합니다.
