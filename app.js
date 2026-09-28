/* ========== 链接导入功能 ========== */
const linkModal = document.getElementById('linkModal');
const linkUrl = document.getElementById('linkUrl');
const fetchLinkBtn = document.getElementById('fetchLinkBtn');
const linkStatus = document.getElementById('linkStatus');
const manualPaste = document.getElementById('manualPaste');
const manualImportBtn = document.getElementById('manualImportBtn');
const closeLinkModal = document.getElementById('closeLinkModal');

// 打开链接导入弹窗
document.getElementById('linkImportBtn').addEventListener('click', () => {
  linkModal.classList.remove('hidden');
  linkUrl.value = '';
  linkStatus.textContent = '';
  manualPaste.style.display = 'none';
  manualImportBtn.style.display = 'none';
});

// 关闭弹窗
closeLinkModal.addEventListener('click', () => {
  linkModal.classList.add('hidden');
});

// 获取链接内容
fetchLinkBtn.addEventListener('click', async () => {
  const url = linkUrl.value.trim();
  if (!url) {
    linkStatus.textContent = '请输入有效的链接';
    return;
  }
  linkStatus.textContent = '正在获取…';
  fetchLinkBtn.disabled = true;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    // 提取纯文本（去除HTML标签）
    const plainText = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (plainText.length < 50) {
      throw new Error('内容过短，可能不是有效页面');
    }
    // 将内容当作txt文件解析
    const cards = parseFile(url, plainText);
    if (cards.length === 0) {
      linkStatus.textContent = '未能解析出技能，请手动粘贴';
      showManualFallback();
      return;
    }
    const all = loadAll();
    cards.forEach(c => c.file = url);
    all.push(...cards);
    saveAll(all);
    refreshFilters();
    render();
    linkModal.classList.add('hidden');
    alert(`成功导入 ${cards.length} 个技能`);
  } catch (err) {
    linkStatus.textContent = '自动获取失败：' + err.message + '。请手动复制页面内容粘贴到下方文本框。';
    showManualFallback();
  } finally {
    fetchLinkBtn.disabled = false;
  }
});

function showManualFallback() {
  manualPaste.style.display = 'block';
  manualImportBtn.style.display = 'inline-block';
}

// 手动导入
manualImportBtn.addEventListener('click', () => {
  const content = manualPaste.value.trim();
  if (!content) {
    linkStatus.textContent = '请先粘贴内容';
    return;
  }
  const cards = parseFile('manual-paste.txt', content);
  if (cards.length === 0) {
    linkStatus.textContent = '未能解析出技能，请检查内容格式';
    return;
  }
  const all = loadAll();
  cards.forEach(c => c.file = '手动粘贴');
  all.push(...cards);
  saveAll(all);
  refreshFilters();
  render();
  linkModal.classList.add('hidden');
  alert(`成功导入 ${cards.length} 个技能`);
});
