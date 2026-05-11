import { Link } from 'react-router-dom';

type Props = {
  bucket: string;
  path: string;
};

export function Breadcrumb({ bucket, path }: Props) {
  const segments = path ? path.split('/').filter(Boolean) : [];

  return (
    <nav className="breadcrumb" aria-label="경로">
      <Link to={`/b/${bucket}`} className="breadcrumb-link">
        📁 {bucket}
      </Link>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const href = `/b/${bucket}/${segments.slice(0, i + 1).join('/')}`;
        return (
          <span key={i} className="breadcrumb-segment">
            <span className="breadcrumb-sep"> / </span>
            {isLast ? (
              <span className="breadcrumb-current">{seg}</span>
            ) : (
              <Link to={href} className="breadcrumb-link">
                {seg}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
