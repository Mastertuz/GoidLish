// Тестирование авторизации
console.log('=== Auth Test Page ===');

async function testAuth() {
  console.log('Testing auth...');
  
  // Тест регистрации
  try {
    const registerResponse = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123456'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('Register response:', registerData);
  } catch (error) {
    console.error('Register error:', error);
  }
  
  // Тест логина
  try {
    const loginResponse = await fetch('/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Запускаем тест при загрузке
if (typeof window !== 'undefined') {
  testAuth();
}

export { testAuth };