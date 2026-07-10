# GitHub Pages 주파수 응답 비교 페이지

## 기본 축
- X축: 20 Hz ~ 20 kHz, 로그 스케일
- Y축: 60 dB ~ 120 dB

## 데이터 추가
1. CSV를 `Data` 폴더에 넣습니다.
2. `Data/files.json`의 `files` 배열에 등록합니다.

```json
{
  "file": "speaker.csv",
  "name": "Speaker",
  "calibration": -1.5,
  "selected": true,
  "applyCalibration": false
}
```

CSV 권장 형식:

```csv
frequency,db
20,82.4
25,83.1
20000,78.2
```

GitHub Pages는 `Data` 폴더의 파일 목록을 자동 탐색할 수 없으므로 새 파일을 넣을 때 `files.json`에도 등록해야 합니다.

보정 적용 시 표시값은 `원본 dB + 보정값`입니다. 원본 CSV는 수정되지 않습니다.
