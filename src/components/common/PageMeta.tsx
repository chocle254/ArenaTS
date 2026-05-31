import React from 'react';
import { Helmet, HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.StrictMode>
    <HelmetProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </HelmetProvider>
  </React.StrictMode>
);

export default PageMeta;
