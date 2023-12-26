import React from 'react'

function InputMessage({ setText, text }) {
  return (
    <textarea
      onChange={(e) => {
        setText(e.target.value)
      }}
      id="story"
      name="story"
      rows="1"
      value={text}
      cols={''}
      placeholder="Message..."
      className={
        text
          ? 'w-full outline-none py-1 pl-3 resize-none pr-8 border text-[#353333] rounded-[50px]'
          : 'w-full outline-none py-1 pl-3 resize-none pr-8 text-[#353333] border-red-400 border  rounded-[50px]'
      }
    ></textarea>
  )
}

export default InputMessage
