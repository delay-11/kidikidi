/* =========================================================
 * 이메일 도메인 자동완성
 * - '@' 입력 시 자주 쓰는 도메인 목록을 보여주고, 입력한 만큼 필터링
========================================================= */
const EMAIL_DOMAINS = [
  "naver.com",
  "hanmail.net",
  "daum.net",
  "gmail.com",
  "kakao.com",
  "nate.com",
];

function initEmailDomainSuggest() {
  if (!emailEl) return;

  const wrap = emailEl.parentElement;
  if (!wrap) return;
  wrap.classList.add("emailSuggestWrap");

  const listEl = document.createElement("ul");
  listEl.className = "emailSuggestList";
  listEl.setAttribute("role", "listbox");
  emailEl.insertAdjacentElement("afterend", listEl);

  emailEl.setAttribute("autocomplete", "off");
  emailEl.setAttribute("aria-autocomplete", "list");

  let activeIndex = -1;

  function hide() {
    listEl.classList.remove("show");
    listEl.innerHTML = "";
    activeIndex = -1;
  }

  function getMatches() {
    const value = emailEl.value;
    const at = value.indexOf("@");
    if (at < 1 || value.indexOf("@", at + 1) !== -1) return null;

    const local = value.slice(0, at);
    const typed = value.slice(at + 1).toLowerCase();
    const domains = EMAIL_DOMAINS.filter((d) => d.startsWith(typed) && d !== typed);
    return domains.length ? { local, domains } : null;
  }

  function setActive(index) {
    const items = listEl.querySelectorAll("li");
    if (!items.length) return;
    activeIndex = (index + items.length) % items.length;
    items.forEach((li, i) => li.classList.toggle("active", i === activeIndex));
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function select(email) {
    emailEl.value = email;
    hide();
    // 다른 입력 핸들러(검증/버튼 상태)가 값 변경을 인식하도록 이벤트 전달
    emailEl.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function render() {
    if (emailEl.readOnly || emailEl.disabled) return hide();

    const matches = getMatches();
    if (!matches) return hide();

    listEl.innerHTML = "";
    matches.domains.forEach((domain) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.textContent = `${matches.local}@${domain}`;
      // blur 검증이 먼저 실행되지 않도록 mousedown 기본동작 차단
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        select(li.textContent);
      });
      listEl.appendChild(li);
    });
    activeIndex = -1;
    listEl.classList.add("show");
  }

  emailEl.addEventListener("input", render);
  emailEl.addEventListener("focus", render);
  emailEl.addEventListener("blur", hide);

  emailEl.addEventListener("keydown", (e) => {
    if (!listEl.classList.contains("show")) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === "Enter" || e.key === "Tab") {
      const item = listEl.querySelectorAll("li")[activeIndex];
      if (!item) return;
      e.preventDefault();
      select(item.textContent);
    } else if (e.key === "Escape") {
      hide();
    }
  });
}

initEmailDomainSuggest();
