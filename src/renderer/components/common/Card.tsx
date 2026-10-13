import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = '', style, ...props }: CardProps): React.ReactElement {
  return (
    <div className={`card ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}
