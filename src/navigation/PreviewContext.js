import { createContext, useContext } from 'react';

// True while a restaurant partner is previewing the customer app from their portal.
export const CustomerPreviewContext = createContext(false);
export const useCustomerPreview = () => useContext(CustomerPreviewContext);
