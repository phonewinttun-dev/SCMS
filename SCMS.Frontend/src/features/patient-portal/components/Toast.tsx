import { Icon } from "./Icons";

export interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="toast" role="status">
      <div className="toast-check">
        <Icon name="check" size={11} color="#fff" strokeWidth={3} />
      </div>
      {message}
    </div>
  );
}
