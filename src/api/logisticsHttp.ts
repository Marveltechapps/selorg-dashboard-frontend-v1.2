import axios, { type AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';
import { getAuthToken } from '../contexts/AuthContext';

export type LogisticsApiPrefix = '/warehouse/logistics' | '/darkstore/logistics';

export function createLogisticsHttp(prefix: LogisticsApiPrefix): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_CONFIG.baseURL}${prefix}`,
    timeout: API_CONFIG.timeout,
  });
  client.interceptors.request.use((config) => {
    const t = getAuthToken();
    if (t) {
      config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
  });
  return client;
}

export function createLogisticsPlatformHttp(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_CONFIG.baseURL}/logistics`,
    timeout: API_CONFIG.timeout,
  });
  client.interceptors.request.use((config) => {
    const t = getAuthToken();
    if (t) {
      config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
  });
  return client;
}
