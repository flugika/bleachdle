// src/lib/test/helpers/selectSearchOption.ts
import { screen, fireEvent, act } from '@testing-library/react';

export async function selectSearchOption(placeholder: string, optionText: string) {
    const input = await screen.findByPlaceholderText(placeholder);

    await act(async () => {
        fireEvent.change(input, { target: { value: optionText } });
        fireEvent.focus(input);
    });

    const option = await screen.findByText(optionText);

    await act(async () => {
        fireEvent.mouseDown(option);
        fireEvent.click(option);
        await Promise.resolve();
    });
}