const API_BASE = '/api';

// DOM元素
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const backBtn = document.getElementById('backBtn');
const projectName = document.getElementById('projectName');
const projectDesc = document.getElementById('projectDesc');
const projectStatus = document.getElementById('projectStatus');
const projectCreated = document.getElementById('projectCreated');
const boardList = document.getElementById('boardList');
const addBoardBtn = document.getElementById('addBoardBtn');
const requirementsList = document.getElementById('requirementsList');
const emptyRequirements = document.getElementById('emptyRequirements');
const addRequirementBtn = document.getElementById('addRequirementBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSubmit = document.getElementById('modalSubmit');
const inputName = document.getElementById('inputName');
const inputDesc = document.getElementById('inputDesc');
const inputPriority = document.getElementById('inputPriority');
const inputStatus = document.getElementById('inputStatus');
const inputProgress = document.getElementById('inputProgress');
const progressValue = document.getElementById('progressValue');
const inputPrototype = document.getElementById('inputPrototype');
const inputSource = document.getElementById('inputSource');
const boardModal = document.getElementById('boardModal');
const boardModalClose = document.getElementById('boardModalClose');
const boardModalCancel = document.getElementById('boardModalCancel');
const boardModalSubmit = document.getElementById('boardModalSubmit');
const boardName = document.getElementById('boardName');
const boardDesc = document.getElementById('boardDesc');
const boardUrl = document.getElementById('boardUrl');
const navItems = document.querySelectorAll('.nav-item');
const projectInfoText = document.getElementById('projectInfoText');
const editInfoBtn = document.getElementById('editInfoBtn');
const infoModal = document.getElementById('infoModal');
const infoModalClose = document.getElementById('infoModalClose');
const infoModalCancel = document.getElementById('infoModalCancel');
const infoModalSubmit = document.getElementById('infoModalSubmit');
const inputInfo = document.getElementById('inputInfo');
const tabItems = document.querySelectorAll('.tab-item');
const tabContents = document.querySelectorAll('.tab-content');

// 状态
let currentProjectId = null;
let currentRequirementId = null;
let currentProjectInfo = '';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    // 有token，直接显示应用并异步验证
    showApp();
    checkAuth();
  } else {
    // 无token，显示登录页面
    showLogin();
  }
  bindEvents();
});

// 检查认证状态
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    showLogin();
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.loggedIn) {
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('id');
        if (currentProjectId) {
          loadProjectDetail(currentProjectId);
        } else {
          window.location.href = 'index.html';
        }
        return;
      }
    }
    // token无效，清除并显示登录
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Auth check failed:', error);
  }
  showLogin();
}

// 显示登录页面
function showLogin() {
  loginPage.style.display = 'flex';
  appContainer.style.display = 'none';
}

// 显示应用
function showApp() {
  loginPage.style.display = 'none';
  appContainer.style.display = 'flex';
}

// 登录
async function login() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();
  
  if (!username || !password) {
    showError('请输入用户名和密码');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem('token', data.token);
      showApp();
      const urlParams = new URLSearchParams(window.location.search);
      currentProjectId = urlParams.get('id');
      if (currentProjectId) {
        loadProjectDetail(currentProjectId);
      }
    } else {
      showError(data.message || '登录失败');
    }
  } catch (error) {
    showError('登录失败，请稍后重试');
  }
}

// 登出
function logout() {
  localStorage.removeItem('token');
  showLogin();
}

// 显示错误
function showError(message) {
  loginError.textContent = message;
  loginError.style.display = 'block';
  setTimeout(() => {
    loginError.style.display = 'none';
  }, 3000);
}

// 带认证的fetch
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  options.headers = options.headers || {};
  options.headers.Authorization = `Bearer ${token}`;
  return fetch(url, options);
}

// 加载项目详情
async function loadProjectDetail(projectId) {
  try {
    const response = await authFetch(`${API_BASE}/projects/${projectId}`);
    if (response && response.ok) {
      const project = await response.json();
      renderProjectDetail(project);
    }
  } catch (error) {
    console.error('加载项目详情失败:', error);
  }
}

// 渲染项目详情
function renderProjectDetail(project) {
  projectName.textContent = project.name;
  projectDesc.textContent = project.description || '暂无描述';
  projectStatus.textContent = getStatusText(project.status);
  projectStatus.className = `status ${project.status}`;
  projectCreated.textContent = formatDate(project.createdAt);
  
  // 渲染项目相关信息（解析链接）
  currentProjectInfo = project.info || '';
  projectInfoText.innerHTML = parseLinks(currentProjectInfo) || '<span style="color:#999">暂无相关信息</span>';
  
  renderBoards(project.boards || []);
  renderRequirements(project.requirements || []);
}

// 解析文本中的URL并转换为可点击链接
function parseLinks(text) {
  if (!text) return '';
  
  // 匹配URL并转换为链接
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  return text.replace(urlPattern, (url) => {
    // 确保链接已经是HTML标签的话不重复转换
    if (url.startsWith('<a')) return url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="info-link">${url}</a>`;
  });
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'active': '进行中',
    'completed': '已完成',
    'pending': '待处理',
    'finalized': '需求定稿',
    'in-progress': '开发中',
    'abandoned': '已废弃',
    'done': '已完结'
  };
  return statusMap[status] || status;
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 渲染看板列表
function renderBoards(boards) {
  if (boards.length === 0) {
    boardList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无看板</p>';
    return;
  }
  
  boardList.innerHTML = boards.map(board => `
    <a href="${board.url}" target="_blank" class="board-item">
      <h4>${board.name}</h4>
      ${board.description ? `<p>${board.description}</p>` : ''}
    </a>
  `).join('');
}

// 渲染需求列表
function renderRequirements(requirements) {
  if (requirements.length === 0) {
    requirementsList.innerHTML = '';
    emptyRequirements.style.display = 'block';
    return;
  }
  
  emptyRequirements.style.display = 'none';
  requirementsList.innerHTML = requirements.map(req => `
    <div class="requirement-item">
      <div class="requirement-priority ${req.priority}"></div>
      <div class="requirement-content">
        <h4>${req.title}</h4>
        <p>${req.description || '暂无描述'}</p>
        ${req.prototypeUrl ? `<a href="${req.prototypeUrl}" target="_blank" class="prototype-link">🔗 原型链接</a>` : ''}
        <div style="color: #999; font-size: 13px; margin-top: 8px;">来源: ${req.source || '未指定'}</div>
      </div>
      <div class="requirement-meta">
        <span class="requirement-status ${req.status}">${getStatusText(req.status)}</span>
        <div class="requirement-progress">
          <span>${req.progress || 0}%</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${req.progress || 0}%"></div>
          </div>
        </div>
      </div>
      <div class="requirement-actions">
        <button class="btn btn-edit" onclick="editRequirement('${req.id}')">✏️</button>
        <button class="btn btn-delete" onclick="deleteRequirement('${req.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

// 添加需求
async function addRequirement() {
  const title = inputName.value.trim();
  const description = inputDesc.value.trim();
  
  if (!title) {
    alert('请输入需求标题');
    return;
  }
  
  try {
    const response = await authFetch(`${API_BASE}/projects/${currentProjectId}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        priority: inputPriority.value,
        status: inputStatus.value,
        progress: parseInt(inputProgress.value),
        prototypeUrl: inputPrototype.value.trim(),
        source: inputSource.value.trim()
      })
    });
    
    if (response && response.ok) {
      closeModal();
      loadProjectDetail(currentProjectId);
    }
  } catch (error) {
    console.error('添加需求失败:', error);
  }
}

// 编辑需求
window.editRequirement = async function(reqId) {
  try {
    const response = await authFetch(`${API_BASE}/projects/${currentProjectId}/requirements/${reqId}`);
    if (response && response.ok) {
      const req = await response.json();
      currentRequirementId = reqId;
      modalTitle.textContent = '编辑需求';
      inputName.value = req.title;
      inputDesc.value = req.description || '';
      inputPriority.value = req.priority || 'medium';
      inputStatus.value = req.status || 'pending';
      inputProgress.value = req.progress || 0;
      progressValue.textContent = `${req.progress || 0}%`;
      inputPrototype.value = req.prototypeUrl || '';
      inputSource.value = req.source || '';
      modal.classList.add('active');
    }
  } catch (error) {
    console.error('获取需求失败:', error);
  }
}

// 更新需求
async function updateRequirement() {
  const title = inputName.value.trim();
  const description = inputDesc.value.trim();
  
  if (!title) {
    alert('请输入需求标题');
    return;
  }
  
  try {
    const response = await authFetch(`${API_BASE}/projects/${currentProjectId}/requirements/${currentRequirementId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        priority: inputPriority.value,
        status: inputStatus.value,
        progress: parseInt(inputProgress.value),
        prototypeUrl: inputPrototype.value.trim(),
        source: inputSource.value.trim()
      })
    });
    
    if (response && response.ok) {
      closeModal();
      loadProjectDetail(currentProjectId);
    }
  } catch (error) {
    console.error('更新需求失败:', error);
  }
}

// 删除需求
window.deleteRequirement = async function(reqId) {
  if (!confirm('确定要删除这个需求吗？')) {
    return;
  }
  
  try {
    const response = await authFetch(`${API_BASE}/projects/${currentProjectId}/requirements/${reqId}`, {
      method: 'DELETE'
    });
    
    if (response && response.ok) {
      loadProjectDetail(currentProjectId);
    }
  } catch (error) {
    console.error('删除需求失败:', error);
  }
}

// 添加看板
async function addBoard() {
  const name = boardName.value.trim();
  const url = boardUrl.value.trim();
  
  if (!name || !url) {
    alert('请填写看板名称和链接');
    return;
  }
  
  try {
    const response = await authFetch(`${API_BASE}/projects/${currentProjectId}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: boardDesc.value.trim(),
        url
      })
    });
    
    if (response && response.ok) {
      closeBoardModal();
      loadProjectDetail(currentProjectId);
    }
  } catch (error) {
    console.error('添加看板失败:', error);
  }
}

// 打开需求模态框
function openRequirementModal() {
  currentRequirementId = null;
  modalTitle.textContent = '添加需求';
  inputName.value = '';
  inputDesc.value = '';
  inputPriority.value = 'medium';
  inputStatus.value = 'pending';
  inputProgress.value = 0;
  progressValue.textContent = '0%';
  inputPrototype.value = '';
  inputSource.value = '';
  modal.classList.add('active');
}

// 关闭模态框
function closeModal() {
  modal.classList.remove('active');
  currentRequirementId = null;
}

// 打开看板模态框
function openBoardModal() {
  boardName.value = '';
  boardDesc.value = '';
  boardUrl.value = '';
  boardModal.classList.add('active');
}

// 关闭看板模态框
function closeBoardModal() {
  boardModal.classList.remove('active');
}

// 提交表单
function submitForm() {
  if (currentRequirementId) {
    updateRequirement();
  } else {
    addRequirement();
  }
}

// 绑定事件
// 打开编辑项目信息模态框
function openInfoModal() {
  // 将纯文本转换为HTML格式，保留换行
  inputInfo.innerHTML = currentProjectInfo.replace(/\n/g, '<br>');
  infoModal.classList.add('active');
}

// 关闭编辑项目信息模态框
function closeInfoModal() {
  infoModal.classList.remove('active');
}

// 保存项目信息
async function saveProjectInfo() {
  const info = inputInfo.innerHTML.trim();
  
  try {
    const response = await authFetch(`${API_BASE}/projects/${currentProjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ info })
    });
    
    if (response && response.ok) {
      currentProjectInfo = info;
      // 立即刷新显示，链接可以点击
      projectInfoText.innerHTML = parseLinks(info) || '<span style="color:#999">暂无相关信息</span>';
      closeInfoModal();
    }
  } catch (error) {
    console.error('保存项目信息失败:', error);
  }
}

// Tab切换
function switchTab(tabName) {
  tabItems.forEach(item => item.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

function bindEvents() {
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  addRequirementBtn.addEventListener('click', openRequirementModal);
  addBoardBtn.addEventListener('click', openBoardModal);
  editInfoBtn.addEventListener('click', openInfoModal);
  
  // Tab切换事件
  tabItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });
  
  // 富文本编辑器工具栏事件
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const command = btn.dataset.command;
      document.execCommand(command, false, null);
      inputInfo.focus();
    });
  });
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalSubmit.addEventListener('click', submitForm);
  boardModalClose.addEventListener('click', closeBoardModal);
  boardModalCancel.addEventListener('click', closeBoardModal);
  boardModalSubmit.addEventListener('click', addBoard);
  infoModalClose.addEventListener('click', closeInfoModal);
  infoModalCancel.addEventListener('click', closeInfoModal);
  infoModalSubmit.addEventListener('click', saveProjectInfo);
  
  // 进度条变化
  inputProgress.addEventListener('input', (e) => {
    progressValue.textContent = `${e.target.value}%`;
  });
  
  // 导航切换
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view === 'index') {
        window.location.href = 'index.html';
      } else if (view === 'kanban') {
        window.location.href = 'kanban.html';
      }
    });
  });
  
  // Enter键登录
  loginPassword.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      login();
    }
  });
}