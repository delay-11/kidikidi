# Keycap Draft Tool

키캡 시안 제작을 위한 웹 기반 내부 툴.

주문 정보를 기반으로 시안을 제작하고 장바구니 관리 및 이메일 전송을 수행한다.

---

## Access

서비스 URL
🌐 https://custom.keycapdesign.co.kr

---

## Features

* 주문자 정보 입력
* 키캡 규격 선택 (OEM / XDA / MAO)
* 캔버스 기반 시안 편집
* 제작 가이드라인 표시
* 장바구니 관리
* 견적 요청 옵션
* EmailJS 기반 메일 전송
* 시안 파일 첨부 (10개 이상 ZIP)

---

## Structure

```
css/
js/
image/
```

---

## Usage

주문 고객에게 전달된 링크를 통해 접속하여  
시안을 제작하고 최종 확정 시 회사로 접수 메일이 발송된다.

---

## Mail Flow

* 시안 확정 시 회사 접수 메일이 발송된다.
* 제작 시안 이미지는 PNG 파일로 첨부된다.
* 시안이 10개 이상일 경우 ZIP 파일로 압축되어 전송된다.
* 견적 요청이 활성화된 경우 고객에게 견적 안내 메일이 함께 발송된다.

---

## License

Internal Use Only

This project is developed for internal company use.  
Unauthorized distribution or reuse is not permitted.