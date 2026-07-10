# GitHub Pages 주파수 응답 비교 페이지

## 변경 사항
- 파일 목록을 페이지 좌측 사이드바에 표시
- CSV 측정값과 TXT 주파수별 보정값 연동
- 각 데이터별 보정 TXT 선택
- 각 데이터별 보정 적용 여부 선택
- 로그 주파수 기준으로 보정값 선형 보간
- 기본 축: 20 Hz~20 kHz / 60~120 dB

## 보정 계산
표시값 = 원본 dB + 보정 TXT의 해당 주파수 보정값

TXT 파일에 측정 주파수가 정확히 없으면 인접한 두 보정점 사이를 로그 주파수 기준으로 선형 보간합니다.

## data/files.json 예시
```json
{
  "corrections": [
    {"file": "diffuse-field-example.txt", "name": "Diffuse Field 예제"}
  ],
  "files": [
    {
      "file": "sample-a.csv",
      "name": "Sample A",
      "selected": true,
      "correctionFile": "diffuse-field-example.txt",
      "applyCorrection": false
    }
  ]
}
```

## TXT 형식
공백, 탭, 쉼표 구분을 지원합니다.

```text
frequency correction_db
20 0.0
1000 0.2
10000 3.0
20000 5.0
```

`diffuse-field-example.txt` 값은 기능 확인용 예시이며 특정 표준, 마이크 또는 헤드폰의 공식 보정값이 아닙니다.
