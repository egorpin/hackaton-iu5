// --- START OF FILE api.js ---

// src/api.js

import axios from 'axios';

const API_URL = 'http://127.0.0.1:8001/api/comets/';

/**
 * Получает список всех комет с сервера.
 */
export const getComets = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.data.results || response.data;
    } catch (error) {
        console.error("Ошибка при загрузке списка комет:", error);
        throw error;
    }
};

/**
 * Создает новую комету (только с именем).
 * @param {object} cometData - Данные для создания, { name: string }.
 */
export const createComet = async (cometData) => {
    try {
        const response = await axios.post(API_URL, cometData);
        return response.data;
    } catch (error) {
        console.error("Ошибка при создании кометы:", error.response?.data);
        throw error.response?.data || { error: "Неизвестная ошибка сервера" };
    }
};

/**
 * Обновляет данные кометы (например, имя).
 * @param {number} cometId - ID кометы.
 * @param {object} cometData - Данные для обновления, { name: string }.
 */
export const updateComet = async (cometId, cometData) => {
    try {
        const response = await axios.patch(`${API_URL}${cometId}/`, cometData);
        return response.data;
    } catch (error) {
        console.error("Ошибка при обновлении кометы:", error.response?.data);
        throw error.response?.data || { error: "Неизвестная ошибка сервера" };
    }
};

/**
 * Удаляет комету.
 * @param {number} cometId - ID кометы.
 */
export const deleteComet = async (cometId) => {
    try {
        await axios.delete(`${API_URL}${cometId}/`);
    } catch (error) {
        console.error("Ошибка при удалении кометы:", error.response?.data);
        throw error.response?.data || { error: "Неизвестная ошибка сервера" };
    }
};

/**
 * Добавляет новое наблюдение к существующей комете и запускает пересчет.
 * @param {number} cometId - ID кометы.
 * @param {object} observationData - Данные наблюдения.
 */
export const addObservationToComet = async (cometId, observationData) => {
    try {
        const response = await axios.post(`${API_URL}${cometId}/observations/`, observationData);
        return response.data;
    } catch (error) {
        console.error("Ошибка при добавлении наблюдения:", error.response?.data);
        throw error.response?.data || { error: "Неизвестная ошибка сервера" };
    }
};
// --- END OF FILE api.js ---
