const API_BASE = '/api';

// DOM元素
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const projectFilter = document.getElementById('projectFilter');
const pendingColumn = document.getElementById('pendingColumn');
const finalizedColumn = document.getElementById('finalizedColumn');
const inProgressColumn = document.getElementById('inProgressColumn');
const doneColumn = document.getElementById('doneColumn');
const pendingCount = document.getElementById('pendingCount');
const finalizedCount = document.getElementById('finalizedCount');
const inProgressCount = document.getElementById('inProgressCount');
const doneCount = document.getElementById('doneCount');
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
const navItems = document.querySelectorAll('.nav-item');

// 状态
let projects = [];
let currentProjectId = null;
let currentRequirementId = null;

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
        loadProjects();
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
      loadProjects();
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

// 加载项目
async function loadProjects() {
  try {
    const response = await authFetch(`${API_BASE}/projects`);
    if (response && response.ok) {
      projects = await response.json();
      populateProjectFilter();
      loadKanban();
    }
  } catch (error) {
    console.error('加载项目失败:', error);
  }
}

// 填充项目过滤器
function populateProjectFilter() {
  let options = '<option value="all">全部项目</option>';
  projects.forEach(project => {
    options += `<option value="${project.id}">${project.name}</option>`;
  });
  projectFilter.innerHTML = options;
}

// 加载看板
function loadKanban() {
  const filterProjectId = projectFilter.value;
  let allRequirements = [];
  
  projects.forEach(project => {
    if (filterProjectId === 'all' || project.id === filterProjectId) {
      if (project.requirements) {
        project.requirements.forEach(req => {
          req.projectName = project.name;
          req.projectId = project.id;
          allRequirements.push(req);
        });
      }
    }
  });
  
  renderKanban(allRequirements);
}

// 渲染看板
function renderKanban(requirements) {
  const pending = requirements.filter(r => r.status === 'pending');
  const finalized = requirements.filter(r => r.status === 'finalized');
  const inProgress = requirements.filter(r => r.status === 'in-progress');
  const done = requirements.filter(r => r.status === 'done');
  
  pendingCount.textContent = pending.length;
  finalizedCount.textContent = finalized.length;
  inProgressCount.textContent = inProgress.length;
  doneCount.textContent = done.length;
  
  pendingColumn.innerHTML = renderColumnCards(pending);
  finalizedColumn.innerHTML = renderColumnCards(finalized);
  inProgressColumn.innerHTML = renderColumnCards(inProgress);
  doneColumn.innerHTML = renderColumnCards(done);
}

// 渲染列卡片
function renderColumnCards(items) {
  if (items.length === 0) {
    return '<div style="text-align: center; color: #999; padding: 20px;">暂无需求</div>';
  }
  
  return items.map(req => `
    <div class="kanban-card" onclick="openRequirementDetail('${req.projectId}', '${req.id}')">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div class="card-priority ${req.priority}"></div>
        <div style="flex: 1;">
          <div class="card-title">${req.title}</div>
          <div class="card-meta">
            <span>${req.projectName}</span>
            <span>${getPriorityText(req.priority)}</span>
          </div>
          <div class="card-progress">
            <span>${req.progress || 0}%</span>
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" style="width: ${req.progress || 0}%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// 获取优先级文本
function getPriorityText(priority) {
  const map = {
    'high': '高',
    'medium': '中',
    'low': '低'
  };
  return map[priority] || priority;
}

// 打开需求详情
window.openRequirementDetail = async function(projectId, reqId) {
  currentProjectId = projectId;
  currentRequirementId = reqId;
  
  try {
    const response = await authFetch(`${API_BASE}/projects/${projectId}/requirements/${reqId}`);
    if (response && response.ok) {
      const req = await response.json();
      modalTitle.textContent = '需求详情';
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
      loadProjects();
    }
  } catch (error) {
    console.error('更新需求失败:', error);
  }
}

// 关闭模态框
function closeModal() {
  modal.classList.remove('active');
  currentRequirementId = null;
}

// 绑定事件
function bindEvents() {
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  projectFilter.addEventListener('change', loadKanban);
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalSubmit.addEventListener('click', updateRequirement);
  
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