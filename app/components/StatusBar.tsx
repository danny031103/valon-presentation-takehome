type StatusBarProps = {
  message: string;
};

export function StatusBar({ message }: StatusBarProps) {
  return <div className="status-bar">{message}</div>;
}
