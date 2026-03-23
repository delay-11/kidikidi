(function () {
  const $ = (id) => document.getElementById(id);
  const safeTrim = (v) => String(v || "").trim();
  const formatPrice = (v) => `${Math.round(Number(v) || 0).toLocaleString("ko-KR")}원`;

  const KEYCAP_PRICE = {
    OEM: {
      "R1-1U": 1280,
      "R1-1.25U": 1580,
      "R1-2.25U": 1780,
      "R1-2.75U": 1980,
      "R1-6.25U": 2280,
      "R2-1U": 1280,
      "R2-1.75U": 1580,
      "R2-2.25U": 1780,
      "R3-1U": 1280,
      "R3-1.5U": 1580,
      "R4-1U": 1280,
      "R4-2U": 1780,
    },
    XDA: { XDA: 1680 },
    MAO: { MAO: 1780 },
  };

  const KEYRING_PRICE = {
    투명: {
      "키링 1구": 1380,
      "키링 2구": 2500,
      "키링 3구": 3000,
      "키링 4구": 3800,
      "키링 5구": 5980,
    },
    반투명블랙: {
      "키링 1구": 1380,
      "키링 2구": 2500,
      "키링 3구": 3000,
      "키링 4구": 3800,
    },
    화이트: {
      "4구 T형": 4980,
      "4구 정사각": 4980,
      "4구 일자형": 4980,
      "5구 십자형": 4980,
      "9구": 7800,
    },
    블랙: {
      "4구 T형": 4980,
      "9구": 7800,
    },
    솔리드: {
      "1구": 1200,
      "2구": 2000,
      "3구": 2800,
      "4구": 3600,
    },
  };

  const profileGuideMap = {
    OEM: {
      title: "OEM 프로파일 안내",
      desc: `· 기성 키보드에서 가장 많이 쓰는 계단형 구조입니다.<br>
· 줄마다 높이와 각도가 달라서 <b>R1~R4 위치에 맞는 규격 선택</b>이 중요합니다.<br>
· 기존 키보드 교체용, 실사용 커스텀에 가장 무난합니다.`,
    },
    XDA: {
      title: "XDA 프로파일 안내",
      desc: `· 모든 열이 같은 높이인 낮은 플랫 구조입니다.<br>
· 위치 구분이 거의 없어 <b>로고 / 단체 굿즈 / 포인트 키캡</b>에 잘 맞습니다.<br>
· 넓고 평평한 면이라 인쇄 디자인 잡기 편합니다.`,
    },
    MAO: {
      title: "MAO 프로파일 안내",
      desc: `· 전체적으로 낮고 둥근 플랫 구조입니다.<br>
· 위치 구분 없이 사용 가능하고, 곡면 느낌이 있어 감성 디자인에 잘 맞습니다.<br>
· MAO는 전용 가이드 형태가 따로 적용됩니다.`,
    },
  };

  const keycapItem = $("keycapItem");
  const keyringItem = $("keyringItem");
  const useKeycap = $("useKeycap");
  const useKeyring = $("useKeyring");
  const profileEl = $("profile");
  const capTypeEl = $("capType");
  const laserEl = $("laser");
  const keycapQtyEl = $("keycapQty");
  const keyringColorEl = $("keyringColor");
  const keyringTypeEl = $("keyringType");
  const keyringLedEl = $("keyringLed");
  const keyringQtyEl = $("keyringQty");
  const rushTypeEl = $("rushType");
  const selectedOptionListEl = $("selectedOptionList");
  const optionGuideTitleEl = $("optionGuideTitle");
  const optionGuideDescEl = $("optionGuideDesc");
  const keycapPriceRowEl = $("keycapPriceRow");
  const keyringPriceRowEl = $("keyringPriceRow");
  const discountPriceRowEl = $("discountPriceRow");
  const rushPriceRowEl = $("rushPriceRow");
  const keycapPriceTextEl = $("keycapPriceText");
  const keyringPriceTextEl = $("keyringPriceText");
  const discountTextEl = $("discountText");
  const rushTextEl = $("rushText");
  const finalPriceTextEl = $("finalPriceText");
  const mobileBarTotalEl = $("mobileBarTotal");
  const mobileQuoteBarEl = $("mobileQuoteBar");
  const mobileQuoteSheetEl = $("mobileQuoteSheet");
  const mobileQuoteSheetDimEl = $("mobileQuoteSheetDim");
  const mobileQuoteCloseEl = $("mobileQuoteClose");
  const mobileQuoteDetailEl = $("mobileQuoteDetail");
  const bizFileInputEl = $("bizFile");
  const bizFileBtnEl = $("bizFileBtn");
  const bizFileDelBtnEl = $("bizFileDelBtn");
  const bizFileNameEl = $("bizFileName");
  const bizFileGuideEl = $("bizFileGuide");
  const designFilesInputEl = $("designFiles");
  const designFileBtnEl = $("designFileBtn");
  const designFileDelBtnEl = $("designFileDelBtn");
  const designFileNameEl = $("designFileName");
  const designFileGuideEl = $("designFileGuide");
  const addKeycapItemBtnEl = $("addKeycapItemBtn");
  const addKeyringItemBtnEl = $("addKeyringItemBtn");
  const submitBtnEl = $("submitQuoteBtn");
  const resetBtnEl = $("resetBtn");

  let selectedBizFile = null;
  let selectedDesignFiles = [];
  let quoteItems = [];

  function getDiscountRate(qty) {
    if (qty >= 5000) return 0.2;
    if (qty >= 1000) return 0.15;
    if (qty >= 500) return 0.1;
    return 0;
  }

  function getRushRate() {
    if (rushTypeEl.value === "fast") return 0.2;
    if (rushTypeEl.value === "urgent") return 0.3;
    return 0;
  }

  function getLaserPrice() {
    if (laserEl.value === "black") return 1120;
    if (laserEl.value === "white") return 2120;
    return 0;
  }

  function populateCapTypes() {
    const profile = safeTrim(profileEl.value);
    const options = CAP_OPTIONS?.[profile] || [];
    capTypeEl.innerHTML = "";

    if (!profile || !options.length) {
      capTypeEl.innerHTML = '<option value="">프로파일을 먼저 선택해주세요</option>';
      updateOptionGuideBox();
      updateQuote();
      return;
    }

    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      capTypeEl.appendChild(option);
    });

    const isLaserAllowed = profile === "OEM";
    laserEl.disabled = !isLaserAllowed;
    if (!isLaserAllowed) laserEl.value = "none";

    updateOptionGuideBox();
    updateQuote();
  }

  function populateKeyringTypes() {
    const color = safeTrim(keyringColorEl.value);
    const map = KEYRING_PRICE[color] || null;
    keyringTypeEl.innerHTML = "";

    if (!color || !map) {
      keyringTypeEl.innerHTML = '<option value="">재질 / 컬러를 먼저 선택해주세요</option>';
      updateQuote();
      return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "종류 선택";
    keyringTypeEl.appendChild(placeholder);

    Object.keys(map).forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      keyringTypeEl.appendChild(option);
    });

    updateQuote();
  }

  function updateAccordionState() {
    keycapItem.classList.toggle("isActive", useKeycap.checked);
    keyringItem.classList.toggle("isActive", useKeyring.checked);
    updateQuote();
  }

  function getCapTypeGuide(profile, capType) {
    if (profile === "OEM") {
      return `· <b>R1~R4</b> = 키보드 줄 위치, <b>U</b> = 키 가로 길이 단위입니다.<br>
· 1U = 일반 문자 키 / 1.25U = Ctrl · Alt / 1.5U = Tab<br>
· 1.75U = Caps Lock / 2.25U = Enter · 좌측 Shift <br>· 2.75U = 우측 Shift / 6.25U = 스페이스바`;
    }

    return `· <b>${profile || "선택 전"}</b>는 단일 규격만 제공되어 별도 규격 선택이 거의 필요 없습니다.`;
  }

  function updateOptionGuideBox() {
    const profile = safeTrim(profileEl.value) || "OEM";
    const capType = safeTrim(capTypeEl.value) || "-";
    const profileData = profileGuideMap[profile] || profileGuideMap.OEM;
    optionGuideTitleEl.textContent = `${profileData.title} · 현재 선택 규격: ${capType}`;
    optionGuideDescEl.innerHTML = `${profileData.desc}<div class="guideSplit"></div>${getCapTypeGuide(profile, capType)}`;
  }

  function updateHelpTooltip(type) {
    const tooltip = document.querySelector(`[data-quote-tooltip="${type}"]`);
    if (!tooltip) return;

    if (type === "profile") {
      const profile = safeTrim(profileEl.value) || "OEM";
      const data = profileGuideMap[profile] || profileGuideMap.OEM;
      tooltip.innerHTML = `<b>${data.title}</b><div class="hr"></div>${data.desc}`;
      return;
    }

    const profile = safeTrim(profileEl.value) || "OEM";
    const capType = safeTrim(capTypeEl.value) || "-";
    tooltip.innerHTML = `<b>현재 선택 규격: ${capType}</b><div class="hr"></div>${getCapTypeGuide(profile, capType)}`;
  }

  function closeAllQuoteTooltips(exceptEl) {
    document.querySelectorAll(".quoteHelpTooltip").forEach((el) => {
      if (el !== exceptEl) el.classList.remove("show");
    });
  }

  function initTooltips() {
    document.querySelectorAll(".quoteHelpIcon").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = btn.dataset.quoteHelp;
        const tooltip = document.querySelector(`[data-quote-tooltip="${type}"]`);
        if (!tooltip) return;
        updateHelpTooltip(type);
        const willOpen = !tooltip.classList.contains("show");
        closeAllQuoteTooltips(tooltip);
        tooltip.classList.toggle("show", willOpen);
      });
    });

    document.addEventListener("click", () => closeAllQuoteTooltips(null));
    window.addEventListener("resize", () => closeAllQuoteTooltips(null));
    window.addEventListener("scroll", () => closeAllQuoteTooltips(null), { passive: true });
  }

  function updateBizFileInfo() {
    if (selectedBizFile) {
      bizFileNameEl.textContent = selectedBizFile.name;
      bizFileGuideEl.textContent = `첨부 완료: ${selectedBizFile.name}`;
      return;
    }

    bizFileNameEl.textContent = "선택된 파일 없음";
    bizFileGuideEl.textContent = "첨부된 파일이 없습니다.";
  }

  function updateDesignFileInfo() {
    if (selectedDesignFiles.length) {
      designFileNameEl.textContent = `${selectedDesignFiles.length}개 파일 선택됨`;
      designFileGuideEl.textContent = selectedDesignFiles.map((file) => file.name).join(", ");
      return;
    }

    designFileNameEl.textContent = "선택된 파일 없음";
    designFileGuideEl.textContent = "PNG / JPG / JPEG 파일을 여러 개 첨부할 수 있습니다.";
  }

  function getKeycapPriceData() {
    if (!useKeycap.checked) {
      return { qty: 0, base: 0, discount: 0, final: 0 };
    }

    const profile = safeTrim(profileEl.value);
    const capType = safeTrim(capTypeEl.value);
    const qty = Number(keycapQtyEl.value) || 0;
    const unitBase = KEYCAP_PRICE?.[profile]?.[capType] || 0;
    const unit = unitBase + getLaserPrice();
    const base = unit * qty;
    const discount = base * getDiscountRate(qty);
    const final = base - discount;
    return { qty, base, discount, final };
  }

  function getKeyringPriceData() {
    if (!useKeyring.checked) {
      return { qty: 0, base: 0, final: 0 };
    }

    const color = safeTrim(keyringColorEl.value);
    const type = safeTrim(keyringTypeEl.value);
    const qty = Number(keyringQtyEl.value) || 0;
    const unit = KEYRING_PRICE?.[color]?.[type] || 0;
    const base = unit * qty;
    return { qty, base, final: base };
  }

  function getKeycapDraftData() {
    const profile = safeTrim(profileEl.value);
    const capType = safeTrim(capTypeEl.value);
    const qty = Number(keycapQtyEl.value) || 0;
    const unitBase = KEYCAP_PRICE?.[profile]?.[capType] || 0;
    const laserPrice = getLaserPrice();
    const unit = unitBase + laserPrice;
    const base = unit * qty;
    const discountRate = getDiscountRate(qty);
    const discount = base * discountRate;
    const final = base - discount;

    return {
      kind: "keycap",
      profile,
      capType,
      laser: laserEl.disabled ? "none" : safeTrim(laserEl.value) || "none",
      laserLabel: laserEl.disabled
        ? "레이저 없음"
        : laserEl.options[laserEl.selectedIndex]?.textContent || "없음",
      qty,
      unit,
      base,
      discountRate,
      discount,
      final,
      memo: safeTrim($("keycapMemo").value),
      designFiles: [...selectedDesignFiles],
    };
  }

  function getKeyringDraftData() {
    const color = safeTrim(keyringColorEl.value);
    const type = safeTrim(keyringTypeEl.value);
    const qty = Number(keyringQtyEl.value) || 0;
    const unit = KEYRING_PRICE?.[color]?.[type] || 0;
    const base = unit * qty;

    return {
      kind: "keyring",
      color,
      type,
      led: safeTrim(keyringLedEl.value) || "없음",
      qty,
      unit,
      base,
      discountRate: 0,
      discount: 0,
      final: base,
      memo: safeTrim($("keyringMemo").value),
    };
  }

  function getQuoteSummaryData() {
    const keycapTotal = quoteItems
      .filter((item) => item.kind === "keycap")
      .reduce((sum, item) => sum + item.final, 0);
    const keyringTotal = quoteItems
      .filter((item) => item.kind === "keyring")
      .reduce((sum, item) => sum + item.final, 0);
    const discountTotal = quoteItems.reduce((sum, item) => sum + (item.discount || 0), 0);
    const subtotal = keycapTotal + keyringTotal;
    const rushAmount = subtotal * getRushRate();
    const total = subtotal + rushAmount;

    return { keycapTotal, keyringTotal, discountTotal, subtotal, rushAmount, total };
  }

  function getQuoteItemLabel(item) {
    if (item.kind === "keycap") {
      const fileLabel = item.designFiles?.length
        ? `이미지 ${item.designFiles.length}개 첨부`
        : "이미지 미첨부";
      return `키캡 · ${item.profile || "-"} / ${item.capType || "-"} / ${item.laserLabel || "레이저 없음"} / ${item.qty.toLocaleString("ko-KR")}개 / ${fileLabel}`;
    }

    return `키링 · ${item.color || "-"} / ${item.type || "-"} / LED ${item.led || "없음"} / ${item.qty.toLocaleString("ko-KR")}개`;
  }

  function clearKeycapInputs() {
    profileEl.value = "";
    capTypeEl.innerHTML = '<option value="">프로파일을 먼저 선택해주세요</option>';
    laserEl.value = "none";
    laserEl.disabled = false;
    keycapQtyEl.value = "";
    $("keycapMemo").value = "";
    selectedDesignFiles = [];
    designFilesInputEl.value = "";
    updateDesignFileInfo();
    updateOptionGuideBox();
  }

  function clearKeyringInputs() {
    keyringColorEl.value = "";
    keyringTypeEl.innerHTML = '<option value="">키링 색상을 먼저 선택해주세요</option>';
    keyringLedEl.value = "없음";
    keyringQtyEl.value = "";
    $("keyringMemo").value = "";
  }

  function addQuoteItem(item) {
    quoteItems.push({
      id: `${item.kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...item,
    });
    updateQuote();
  }

  function removeQuoteItem(id) {
    quoteItems = quoteItems.filter((item) => item.id !== id);
    updateQuote();
  }

  function validateKeycapDraft() {
    if (!safeTrim(profileEl.value)) {
      showToast("키캡 프로파일을 선택해주세요.", "warn");
      profileEl.focus();
      return false;
    }
    if (!safeTrim(capTypeEl.value)) {
      showToast("키캡 규격을 선택해주세요.", "warn");
      capTypeEl.focus();
      return false;
    }
    if ((Number(keycapQtyEl.value) || 0) <= 0) {
      showToast("키캡 수량을 입력해주세요.", "warn");
      keycapQtyEl.focus();
      return false;
    }
    return true;
  }

  function validateKeyringDraft() {
    if (!safeTrim(keyringColorEl.value)) {
      showToast("키링 재질 / 컬러를 선택해주세요.", "warn");
      keyringColorEl.focus();
      return false;
    }
    if (!safeTrim(keyringTypeEl.value)) {
      showToast("키링 종류를 선택해주세요.", "warn");
      keyringTypeEl.focus();
      return false;
    }
    if ((Number(keyringQtyEl.value) || 0) <= 0) {
      showToast("키링 수량을 입력해주세요.", "warn");
      keyringQtyEl.focus();
      return false;
    }
    return true;
  }

  function buildSelectedOptions(keycapData, keyringData) {
    const items = [];

    if (useKeycap.checked) {
      const profile = safeTrim(profileEl.value) || "-";
      const capType = capTypeEl.options[capTypeEl.selectedIndex]?.textContent || "-";
      const laserLabel = laserEl.disabled
        ? "레이저 없음"
        : laserEl.options[laserEl.selectedIndex]?.textContent || "없음";
      const qtyLabel = keycapData.qty ? `${keycapData.qty.toLocaleString("ko-KR")}개` : "수량 미입력";
      const fileLabel = selectedDesignFiles.length
        ? `이미지 ${selectedDesignFiles.length}개 첨부`
        : "이미지 미첨부";
      items.push(`키캡 · ${profile} / ${capType} / ${laserLabel} / ${qtyLabel} / ${fileLabel}`);
    }

    if (useKeyring.checked) {
      const color = safeTrim(keyringColorEl.value) || "-";
      const type = safeTrim(keyringTypeEl.value) || "-";
      const led = safeTrim(keyringLedEl.value) || "없음";
      const qtyLabel = keyringData.qty ? `${keyringData.qty.toLocaleString("ko-KR")}개` : "수량 미입력";
      items.push(`키링 · ${color} / ${type} / LED ${led} / ${qtyLabel}`);
    }

    return items;
  }

  function updateSelectedOptionList(items) {
    selectedOptionListEl.innerHTML = "";

    if (!items.length) {
      const li = document.createElement("li");
      li.className = "quoteEmptyText";
      li.textContent = "아직 추가된 견적 항목이 없습니다.";
      selectedOptionListEl.appendChild(li);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "quoteItemRow";

      const text = document.createElement("span");
      text.className = "quoteItemText";
      text.textContent = getQuoteItemLabel(item);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "dangerBtn quoteItemDeleteBtn";
      delBtn.textContent = "삭제";
      delBtn.addEventListener("click", () => removeQuoteItem(item.id));

      li.appendChild(text);
      li.appendChild(delBtn);
      selectedOptionListEl.appendChild(li);
    });
  }

  function getSummaryHtml() {
    return document.querySelector(".quoteSummaryPanel")?.outerHTML || "";
  }

  function updateMobileDetail() {
    mobileQuoteDetailEl.innerHTML = getSummaryHtml();
  }

  function setSummaryRowVisible(el, isVisible) {
    if (!el) return;
    el.hidden = !isVisible;
    el.style.display = isVisible ? "flex" : "none";
  }

  function updateQuote() {
    const summary = getQuoteSummaryData();

    setSummaryRowVisible(keycapPriceRowEl, summary.keycapTotal > 0);
    setSummaryRowVisible(keyringPriceRowEl, summary.keyringTotal > 0);
    setSummaryRowVisible(discountPriceRowEl, summary.discountTotal > 0);
    setSummaryRowVisible(rushPriceRowEl, summary.rushAmount > 0);

    keycapPriceTextEl.textContent = formatPrice(summary.keycapTotal);
    keyringPriceTextEl.textContent = formatPrice(summary.keyringTotal);
    discountTextEl.textContent = `-${formatPrice(summary.discountTotal)}`;
    rushTextEl.textContent = `+${formatPrice(summary.rushAmount)}`;
    finalPriceTextEl.textContent = formatPrice(summary.total);
    mobileBarTotalEl.textContent = formatPrice(summary.total);

    updateSelectedOptionList(quoteItems);
    updateMobileDetail();
  }

  function openMobileSheet() {
    mobileQuoteSheetEl.hidden = false;
    mobileQuoteBarEl.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeMobileSheet() {
    mobileQuoteSheetEl.hidden = true;
    mobileQuoteBarEl.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function resetForm() {
    $("companyName").value = "";
    $("managerName").value = "";
    $("phone").value = "";
    $("email").value = "";
    $("dueDate").value = "";
    rushTypeEl.value = "normal";

    useKeycap.checked = false;
    useKeyring.checked = false;
    profileEl.value = "";
    capTypeEl.innerHTML = '<option value="">프로파일을 먼저 선택해주세요</option>';
    laserEl.value = "none";
    laserEl.disabled = false;
    keycapQtyEl.value = "";
    $("keycapMemo").value = "";

    keyringColorEl.value = "";
    keyringTypeEl.innerHTML = '<option value="">재질 / 컬러를 먼저 선택해주세요</option>';
    keyringLedEl.value = "없음";
    keyringQtyEl.value = "";
    $("keyringMemo").value = "";

    selectedBizFile = null;
    selectedDesignFiles = [];
    quoteItems = [];
    bizFileInputEl.value = "";
    designFilesInputEl.value = "";

    updateBizFileInfo();
    updateDesignFileInfo();
    updateAccordionState();
    updateOptionGuideBox();
    showToast("입력 내용을 초기화했습니다.", "info");
  }

  function validateForm() {
    if (!safeTrim($("companyName").value)) {
      showToast("업체명을 입력해주세요.", "warn");
      $("companyName").focus();
      return false;
    }

    if (!safeTrim($("managerName").value)) {
      showToast("담당자명을 입력해주세요.", "warn");
      $("managerName").focus();
      return false;
    }

    if (!safeTrim($("phone").value)) {
      showToast("연락처를 입력해주세요.", "warn");
      $("phone").focus();
      return false;
    }

    if (!safeTrim($("email").value)) {
      showToast("이메일을 입력해주세요.", "warn");
      $("email").focus();
      return false;
    }

    if (!selectedBizFile) {
      showToast("사업자등록증 PDF를 첨부해주세요.", "warn");
      return false;
    }

    if (!quoteItems.length) {
      showToast("견적 항목을 먼저 추가해주세요.", "warn");
      return false;
    }

    return true;
  }

  function bindEvents() {
    useKeycap.addEventListener("change", updateAccordionState);
    useKeyring.addEventListener("change", updateAccordionState);
    profileEl.addEventListener("change", populateCapTypes);
    capTypeEl.addEventListener("change", () => {
      updateOptionGuideBox();
      updateQuote();
    });
    laserEl.addEventListener("change", updateQuote);
    keycapQtyEl.addEventListener("input", updateQuote);
    keyringColorEl.addEventListener("change", populateKeyringTypes);
    keyringTypeEl.addEventListener("change", updateQuote);
    keyringLedEl.addEventListener("change", updateQuote);
    keyringQtyEl.addEventListener("input", updateQuote);
    rushTypeEl.addEventListener("change", updateQuote);

    addKeycapItemBtnEl.addEventListener("click", () => {
      if (!validateKeycapDraft()) return;
      addQuoteItem(getKeycapDraftData());
      clearKeycapInputs();
      useKeycap.checked = false;
      updateAccordionState();
      showToast("키캡 견적 항목을 추가했습니다.", "ok");
    });

    addKeyringItemBtnEl.addEventListener("click", () => {
      if (!validateKeyringDraft()) return;
      addQuoteItem(getKeyringDraftData());
      clearKeyringInputs();
      useKeyring.checked = false;
      updateAccordionState();
      showToast("키링 견적 항목을 추가했습니다.", "ok");
    });

    bizFileBtnEl.addEventListener("click", () => bizFileInputEl.click());
    bizFileInputEl.addEventListener("change", () => {
      selectedBizFile = bizFileInputEl.files?.[0] || null;
      updateBizFileInfo();
    });
    bizFileDelBtnEl.addEventListener("click", () => {
      selectedBizFile = null;
      bizFileInputEl.value = "";
      updateBizFileInfo();
    });

    designFileBtnEl.addEventListener("click", () => designFilesInputEl.click());
    designFilesInputEl.addEventListener("change", () => {
      selectedDesignFiles = Array.from(designFilesInputEl.files || []);
      updateDesignFileInfo();
      updateQuote();
    });
    designFileDelBtnEl.addEventListener("click", () => {
      selectedDesignFiles = [];
      designFilesInputEl.value = "";
      updateDesignFileInfo();
      updateQuote();
    });

    mobileQuoteBarEl.addEventListener("click", openMobileSheet);
    mobileQuoteSheetDimEl.addEventListener("click", closeMobileSheet);
    mobileQuoteCloseEl.addEventListener("click", closeMobileSheet);

    resetBtnEl.addEventListener("click", resetForm);
    submitBtnEl.addEventListener("click", () => {
      if (!validateForm()) return;
      showToast("견적 요청 준비가 완료되었습니다. 메일 연결만 남았습니다.", "ok");
    });
  }

  function init() {
    populateCapTypes();
    updateBizFileInfo();
    updateDesignFileInfo();
    updateOptionGuideBox();
    updateAccordionState();
    initTooltips();
    bindEvents();
    updateQuote();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
