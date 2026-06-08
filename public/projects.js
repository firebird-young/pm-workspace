const API_BASE = '/api';

// DOM元素
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const projectsGrid = document.getElementById('projectsGrid');
const emptyState = document.getElementById('emptyState');
const addProjectBtn = document.getElementById('addProjectBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSubmit = document.getElementById('modalSubmit');
const inputName = document.getElementById('inputName');
const inputDesc = document.getElementById('inputDesc');
const inputAvatar = document.getElementById('inputAvatar');
const avatarPreview = document.getElementById('avatarPreview');
const navItems = document.querySelectorAll('.nav-item');

// 状态
let currentProjectId = null;

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

// 加载项目列表
async function loadProjects() {
  try {
    const response = await authFetch(`${API_BASE}/projects`);
    if (response && response.ok) {
      const projects = await response.json();
      renderProjects(projects);
    }
  } catch (error) {
    console.error('加载项目失败:', error);
  }
}

// 渲染项目列表
function renderProjects(projects) {
  if (projects.length === 0) {
    projectsGrid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  projectsGrid.innerHTML = projects.map(project => `
    <div class="project-card" data-id="${project.id}">
      <div class="project-card-header">
        ${project.avatar ? 
          `<img src="${project.avatar}" alt="${project.name}" class="project-avatar" onerror="this.style.display='none'">` : 
          `<div class="project-avatar-placeholder">${project.name.charAt(0)}</div>`
        }
      </div>
      <h3>${project.name}</h3>
      <p>${project.description || '暂无描述'}</p>
      <div class="meta">
        <span class="status ${project.status}">${getStatusText(project.status)}</span>
        <span>${formatDate(project.createdAt)}</span>
      </div>
      <div style="margin-top: 12px; color: #999; font-size: 13px;">
        需求数: ${project.requirements?.length || 0}
      </div>
      <div class="project-actions">
        <button class="btn btn-edit-project" onclick="editProject('${project.id}')">✏️ 编辑</button>
        <button class="btn btn-delete-project" onclick="deleteProject('${project.id}')">🗑️ 删除</button>
      </div>
    </div>
  `).join('');
  
  // 项目卡片点击事件
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete-project') || e.target.classList.contains('btn-edit-project')) {
        return;
      }
      const projectId = card.dataset.id;
      window.location.href = `detail.html?id=${projectId}`;
    });
  });
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'active': '进行中',
    'completed': '已完成',
    'pending': '待开始'
  };
  return statusMap[status] || status;
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 当前编辑的项目ID
let editingProjectId = null;

// 添加/更新项目
async function saveProject() {
  const name = inputName.value.trim();
  const description = inputDesc.value.trim();
  
  if (!name) {
    alert('请输入项目名称');
    return;
  }
  
  // 处理图片上传
  let avatar = '';
  if (inputAvatar.files && inputAvatar.files[0]) {
    const file = inputAvatar.files[0];
    const reader = new FileReader();
    avatar = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
  
  try {
    let response;
    if (editingProjectId) {
      // 更新项目
      response = await authFetch(`${API_BASE}/projects/${editingProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, avatar })
      });
    } else {
      // 添加项目
      response = await authFetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, avatar })
      });
    }
    
    if (response && response.ok) {
      closeModal();
      loadProjects();
    }
  } catch (error) {
    console.error('保存项目失败:', error);
  }
}

// 删除项目
window.deleteProject = async function(projectId) {
  if (!confirm('确定要删除这个项目吗？删除后无法恢复！')) {
    return;
  }
  
  try {
    const response = await authFetch(`${API_BASE}/projects/${projectId}`, {
      method: 'DELETE'
    });
    
    if (response && response.ok) {
      loadProjects();
    }
  } catch (error) {
    console.error('删除项目失败:', error);
  }
}

// 编辑项目
window.editProject = async function(projectId) {
  try {
    const response = await authFetch(`${API_BASE}/projects/${projectId}`);
    if (response && response.ok) {
      const project = await response.json();
      editingProjectId = projectId;
      modalTitle.textContent = '编辑项目';
      inputName.value = project.name;
      inputDesc.value = project.description || '';
      inputAvatar.value = '';
      if (project.avatar) {
        avatarPreview.innerHTML = `<img src="${project.avatar}" alt="头像预览" class="avatar-preview-img">`;
      } else {
        avatarPreview.innerHTML = '';
      }
      modal.classList.add('active');
    }
  } catch (error) {
    console.error('获取项目失败:', error);
  }
}

// 打开模态框
function openModal() {
  editingProjectId = null;
  modalTitle.textContent = '添加项目';
  inputName.value = '';
  inputDesc.value = '';
  inputAvatar.value = '';
  avatarPreview.innerHTML = '';
  modal.classList.add('active');
}

// 关闭模态框
function closeModal() {
  editingProjectId = null;
  modal.classList.remove('active');
}

// 头像预览
inputAvatar.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.innerHTML = `<img src="${e.target.result}" alt="头像预览" class="avatar-preview-img">`;
    };
    reader.readAsDataURL(file);
  } else {
    avatarPreview.innerHTML = '';
  }
});

// 绑定事件
function bindEvents() {
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  addProjectBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalSubmit.addEventListener('click', saveProject);
  
  // 导航切换
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view === 'kanban') {
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