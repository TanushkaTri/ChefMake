// Скрипт для проверки конфигурации AI сервиса
require("dotenv").config();
const axios = require('axios');

console.log('🔍 Проверка конфигурации AI сервиса...\n');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-2512';

if (!MISTRAL_API_KEY) {
    console.error('❌ MISTRAL_API_KEY не установлена в .env файле');
    console.log('\n💡 Добавьте в backend/.env:');
    console.log('   MISTRAL_API_KEY=meXqMzkvBPHtFf9n8XQwPfbCOTIhZVES');
    process.exit(1);
}

console.log(`✅ MISTRAL_API_KEY установлена (модель: ${MISTRAL_MODEL})\n`);

// Проверка доступности эндпоинта Mistral Chat Completions
const endpoints = [
    { name: 'Chat Completions', url: 'https://api.mistral.ai/v1/chat/completions', testData: { messages: [{ role: 'user', content: 'Hello' }], model: MISTRAL_MODEL } },
];

console.log('🔌 Проверка доступности AI эндпоинтов...\n');

(async () => {
    for (const endpoint of endpoints) {
        try {
            console.log(`Проверка ${endpoint.name} (${endpoint.url})...`);
            const response = await axios.post(endpoint.url, endpoint.testData, {
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${MISTRAL_API_KEY}`,
                },
                timeout: 10000,
                validateStatus: () => true, // Принимаем любые статусы
            });
            
            if (response.status === 200 || response.status === 422) {
                console.log(`   ✅ ${endpoint.name} доступен (статус: ${response.status})`);
            } else {
                console.log(`   ⚠️  ${endpoint.name} вернул статус: ${response.status}`);
                if (response.data) {
                    console.log(`   Ответ: ${JSON.stringify(response.data).substring(0, 100)}...`);
                }
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                console.log(`   ❌ ${endpoint.name} недоступен: ${error.message}`);
            } else if (error.response) {
                console.log(`   ⚠️  ${endpoint.name} вернул ошибку: ${error.response.status}`);
            } else {
                console.log(`   ❌ ${endpoint.name} ошибка: ${error.message}`);
            }
        }
        console.log('');
    }

    console.log('✅ Проверка завершена!');
    console.log('\n💡 Если эндпоинт недоступен:');
    console.log('   1. Проверьте корректность MISTRAL_API_KEY');
    console.log('   2. Убедитесь, что у ключа есть доступ к модели');
    console.log('   3. Проверьте подключение к https://api.mistral.ai');
})();

