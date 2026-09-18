import { formatDistanceToNow } from 'date-fns';

export function RelativeTime({ iso, suffix = true }: { iso: string; suffix?: boolean }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {formatDistanceToNow(new Date(iso), { addSuffix: suffix })}
    </time>
  );
}
