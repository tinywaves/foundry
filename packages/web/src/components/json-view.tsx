import { useMemo, useState } from 'react';
import { JsonInput } from '@mantine/core';
import ReactJson from 'react-json-view';

export default function JsonView() {
  const [value, setValue] = useState('');
  const json = useMemo(() => {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }, [value]);

  return (
    <>
      <JsonInput value={value} onChange={setValue} />
      <ReactJson src={json} />
    </>
  );
}
