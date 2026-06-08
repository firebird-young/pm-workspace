import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/*', cors({
  credentials: true
}))

// 固定用户凭证
const VALID_USERNAME = 'youngoku'
const VALID_PASSWORD = 'yyz111'

// 简单的认证中间件
const authenticate = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ error: '未登录' }, 401)
  }
  
  // 支持 Bearer token 格式
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader
  
  const storedToken = await c.env.PROJECTS_DB.get('auth_token')
  
  if (token !== storedToken) {
    return c.json({ error: '登录失效' }, 401)
  }
  
  await next()
}

// 登录接口
app.post('/api/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body
    
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const token = Date.now().toString() + Math.random().toString(36).substr(2)
      await c.env.PROJECTS_DB.put('auth_token', token)
      return c.json({ success: true, token })
    }
    
    return c.json({ error: '用户名或密码错误' }, 401)
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: '登录失败' }, 500)
  }
})

// 检查登录状态
app.get('/api/auth/status', async (c) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ loggedIn: false })
  }
  
  // 支持 Bearer token 格式
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader
    
  const storedToken = await c.env.PROJECTS_DB.get('auth_token')
  
  if (token && token === storedToken) {
    return c.json({ loggedIn: true })
  }
  
  return c.json({ loggedIn: false })
})

// 登出
app.post('/api/logout', async (c) => {
  await c.env.PROJECTS_DB.delete('auth_token')
  return c.json({ success: true })
})

// 项目相关API（需要认证）
app.get('/api/projects', authenticate, async (c) => {
  const projects = await c.env.PROJECTS_DB.get('projects')
  return c.json(projects ? JSON.parse(projects) : [])
})

app.get('/api/projects/:id', authenticate, async (c) => {
  const id = c.req.param('id')
  const projects = await c.env.PROJECTS_DB.get('projects')
  const projectList = projects ? JSON.parse(projects) : []
  const project = projectList.find(p => p.id === id)
  if (project) {
    return c.json(project)
  }
  return c.json({ error: '项目不存在' }, 404)
})

app.post('/api/projects', authenticate, async (c) => {
  try {
    const body = await c.req.json()
    const projects = await c.env.PROJECTS_DB.get('projects')
    const projectList = projects ? JSON.parse(projects) : []
    
    const newProject = {
      id: Date.now().toString(),
      name: body.name,
      description: body.description || '',
      avatar: body.avatar || '',
      status: body.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirements: [],
      boards: []
    }
    
    projectList.push(newProject)
    await c.env.PROJECTS_DB.put('projects', JSON.stringify(projectList))
    return c.json(newProject, 201)
  } catch (error) {
    console.error('Error:', error)
    return c.json({ error: '创建失败' }, 500)
  }
})

app.put('/api/projects/:id', authenticate, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const projects = await c.env.PROJECTS_DB.get('projects')
    const projectList = projects ? JSON.parse(projects) : []
    const index = projectList.findIndex(p => p.id === id)
    
    if (index === -1) {
      return c.json({ error: '项目不存在' }, 404)
    }
    
    projectList[index] = {
      ...projectList[index],
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    await c.env.PROJECTS_DB.put('projects', JSON.stringify(projectList))
    return c.json(projectList[index])
  } catch (error) {
    return c.json({ error: '更新失败' }, 500)
  }
})

app.delete('/api/projects/:id', authenticate, async (c) => {
  const id = c.req.param('id')
  const projects = await c.env.PROJECTS_DB.get('projects')
  const projectList = projects ? JSON.parse(projects) : []
  const filtered = projectList.filter(p => p.id !== id)
  
  await c.env.PROJECTS_DB.put('projects', JSON.stringify(filtered))
  return c.json({ success: true })
})

// 需求相关API（需要认证）
app.get('/api/projects/:id/requirements/:reqId', authenticate, async (c) => {
  const id = c.req.param('id')
  const reqId = c.req.param('reqId')
  const projects = await c.env.PROJECTS_DB.get('projects')
  const projectList = projects ? JSON.parse(projects) : []
  const project = projectList.find(p => p.id === id)
  
  if (!project) {
    return c.json({ error: '项目不存在' }, 404)
  }
  
  const requirement = project.requirements?.find(r => r.id === reqId)
  if (requirement) {
    return c.json(requirement)
  }
  return c.json({ error: '需求不存在' }, 404)
})

app.get('/api/projects/:id/requirements', authenticate, async (c) => {
  const id = c.req.param('id')
  const projects = await c.env.PROJECTS_DB.get('projects')
  const projectList = projects ? JSON.parse(projects) : []
  const project = projectList.find(p => p.id === id)
  
  if (!project) {
    return c.json({ error: '项目不存在' }, 404)
  }
  
  return c.json(project.requirements || [])
})

app.post('/api/projects/:id/requirements', authenticate, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const projects = await c.env.PROJECTS_DB.get('projects')
    const projectList = projects ? JSON.parse(projects) : []
    const index = projectList.findIndex(p => p.id === id)
    
    if (index === -1) {
      return c.json({ error: '项目不存在' }, 404)
    }
    
    const newRequirement = {
      id: Date.now().toString(),
      title: body.title,
      description: body.description || '',
      priority: body.priority || 'medium',
      status: body.status || 'pending',
      assignee: body.assignee || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: body.progress || 0,
      prototypeUrl: body.prototypeUrl || '',
      source: body.source || ''
    }
    
    projectList[index].requirements = projectList[index].requirements || []
    projectList[index].requirements.push(newRequirement)
    projectList[index].updatedAt = new Date().toISOString()
    
    await c.env.PROJECTS_DB.put('projects', JSON.stringify(projectList))
    return c.json(newRequirement, 201)
  } catch (error) {
    console.error('Error:', error)
    return c.json({ error: '创建失败' }, 500)
  }
})

app.put('/api/projects/:id/requirements/:reqId', authenticate, async (c) => {
  try {
    const id = c.req.param('id')
    const reqId = c.req.param('reqId')
    const body = await c.req.json()
    const projects = await c.env.PROJECTS_DB.get('projects')
    const projectList = projects ? JSON.parse(projects) : []
    const projectIndex = projectList.findIndex(p => p.id === id)
    
    if (projectIndex === -1) {
      return c.json({ error: '项目不存在' }, 404)
    }
    
    const reqIndex = projectList[projectIndex].requirements.findIndex(r => r.id === reqId)
    if (reqIndex === -1) {
      return c.json({ error: '需求不存在' }, 404)
    }
    
    projectList[projectIndex].requirements[reqIndex] = {
      ...projectList[projectIndex].requirements[reqIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }
    projectList[projectIndex].updatedAt = new Date().toISOString()
    
    await c.env.PROJECTS_DB.put('projects', JSON.stringify(projectList))
    return c.json(projectList[projectIndex].requirements[reqIndex])
  } catch (error) {
    return c.json({ error: '更新失败' }, 500)
  }
})

app.delete('/api/projects/:id/requirements/:reqId', authenticate, async (c) => {
  const id = c.req.param('id')
  const reqId = c.req.param('reqId')
  const projects = await c.env.PROJECTS_DB.get('projects')
  const projectList = projects ? JSON.parse(projects) : []
  const projectIndex = projectList.findIndex(p => p.id === id)
  
  if (projectIndex === -1) {
    return c.json({ error: '项目不存在' }, 404)
  }
  
  projectList[projectIndex].requirements = projectList[projectIndex].requirements.filter(r => r.id !== reqId)
  projectList[projectIndex].updatedAt = new Date().toISOString()
  
  await c.env.PROJECTS_DB.put('projects', JSON.stringify(projectList))
  return c.json({ success: true })
})

// 看板相关API（需要认证）
app.post('/api/projects/:id/boards', authenticate, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const projects = await c.env.PROJECTS_DB.get('projects')
    const projectList = projects ? JSON.parse(projects) : []
    const index = projectList.findIndex(p => p.id === id)
    
    if (index === -1) {
      return c.json({ error: '项目不存在' }, 404)
    }
    
    const newBoard = {
      id: Date.now().toString(),
      name: body.name,
      description: body.description || '',
      url: body.url || '',
      createdAt: new Date().toISOString()
    }
    
    projectList[index].boards = projectList[index].boards || []
    projectList[index].boards.push(newBoard)
    projectList[index].updatedAt = new Date().toISOString()
    
    await c.env.PROJECTS_DB.put('projects', JSON.stringify(projectList))
    return c.json(newBoard, 201)
  } catch (error) {
    console.error('Error:', error)
    return c.json({ error: '创建失败' }, 500)
  }
})

app.delete('/api/projects/:id/boards/:boardId', authenticate, async (c) => {
  const id = c.req.param('id')
  const boardId = c.req.param('boardId')
  const projects = await c.env.PROJECTS_DB.get('projects')
  const projectList = projects ? JSON.parse(projects) : []
  const projectIndex = projectList.findIndex(p => p.id === id)
  
  if (projectIndex === -1) {
    return c.json({ error: '项目不存在' }, 404)
  }
  
  projectList[projectIndex].boards = projectList[projectIndex].boards.filter(b => b.id !== boardId)
  projectList[projectIndex].updatedAt = new Date().toISOString()
  
  await c.env.PROJECTS_DB.put('projects', JSON.stringify(projectList))
  return c.json({ success: true })
})

export default app
