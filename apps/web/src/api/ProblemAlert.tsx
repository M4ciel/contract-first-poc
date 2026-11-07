import type { ProblemDetailsOutput } from '@acme/api-types';
import { toProblemMessage } from './problem-message.ts';

export const ProblemAlert = ({ problem }: { readonly problem: ProblemDetailsOutput }) => {
  const message = toProblemMessage(problem);
  return (
    <div role="alert" className="alert">
      <strong>{message.title}</strong>
      {message.detail && <p>{message.detail}</p>}
      {message.fields.length > 0 && (
        <ul>
          {message.fields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
