import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewsList from './NewsList';
import api from '../../../api/axios';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../api/axios', () => {
    return {
        default: {
            get: vi.fn()
        }
    };
});

describe('NewsList Component', () => {
    it('1. should display loading spinner initially', () => {
        api.get.mockImplementation(() => new Promise(() => {})); // pending promise
        const { container } = render(<NewsList />);
        expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('2. should display error message when API fails', async () => {
        api.get.mockRejectedValue(new Error('API Error'));
        render(<NewsList />);
        
        await waitFor(() => {
            expect(screen.getByText('뉴스를 불러오지 못했습니다.')).toBeInTheDocument();
        });
    });

    it('3. should display news data when API succeeds', async () => {
        const mockData = {
            data: [
                { id: 1, title: '테스트 뉴스 제목', summary: '테스트 요약', date: '방금', tag: '호재', type: 'up' }
            ]
        };
        api.get.mockResolvedValue({ data: mockData });
        render(<NewsList />);
        
        await waitFor(() => {
            expect(screen.getByText('테스트 뉴스 제목')).toBeInTheDocument();
            expect(screen.getByText('테스트 요약')).toBeInTheDocument();
        });
    });
});
