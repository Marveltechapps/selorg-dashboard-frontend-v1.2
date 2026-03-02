import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';

const API_URL = `${API_CONFIG.baseURL}/catalog`;

export const catalogApi = {
  getSkus: async () => {
    const response = await axios.get(`${API_URL}/skus`);
    return response.data;
  },
  createSku: async (data: any) => {
    const response = await axios.post(`${API_URL}/skus`, data);
    return response.data;
  },
  updateSku: async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/skus/${id}`, data);
    return response.data;
  },
  deleteSku: async (id: string) => {
    const response = await axios.delete(`${API_URL}/skus/${id}`);
    return response.data;
  },
  getCollections: async () => {
    const response = await axios.get(`${API_URL}/collections`);
    return response.data;
  },
  createCollection: async (data: any) => {
    const response = await axios.post(`${API_URL}/collections`, data);
    return response.data;
  },
  updateCollection: async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/collections/${id}`, data);
    return response.data;
  },
  deleteCollection: async (id: string) => {
    const response = await axios.delete(`${API_URL}/collections/${id}`);
    return response.data;
  }
};
