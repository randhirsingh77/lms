import React, { useRef } from 'react';
import JoditEditor from 'jodit-react';

const RichTextEditor = ({ input, setInput }) => {
  const editor = useRef(null);

  const handleChange = (newContent) => {
    setInput({ ...input, description: newContent });
  };

  return (
    <JoditEditor
      ref={editor}
      value={input.description}
      onChange={handleChange}
    />
  );
};

export default RichTextEditor;
