import React from 'react'

function Message({ owner, message }) {
  return (
    <div className="">
      <div
        className={
          owner
            ? 'px-3 flex flex-col items-start'
            : 'px-3 flex flex-col items-end'
        }
      >
        {message?.text && message?.images?.length > 0 && (
          <div
            className={
              owner
                ? 'max-w-[250px] bg-[#8ba1ee] my-2 md:my-2 p-2 flex  rounded-[7px]'
                : 'max-w-[250px] bg-yellow-300 my-2 p-2 md:my-2 flex rounded-[7px]'
            }
          >
            <div className="relative">
              <p className=" text-[rgba(0,0,0,0.76)] text-[14px]">
                {message.text}
                <div className="">
                  {message.images.map((img) => (
                    <img
                      src={img}
                      alt="images sender"
                      className="h-[200px] w-[100%] object-cover rounded-[3px]"
                      key={img._id}
                    />
                  ))}
                </div>
              </p>
              <div className="absolute right-0 bottom-0 gradiant py-1 px-2 text-[11px] rounded text-white">
                {message.createdAt.split('T')[1].split('.')[0]}
              </div>
            </div>
          </div>
        )}
        {message?.text && !message?.images?.length > 0 && (
          <div
            className={
              owner
                ? 'max-w-[250px] bg-[#8ba1ee] my-2 md:my-2 p-2 flex rounded-bl-[25px] rounded-r-[25px]'
                : 'max-w-[250px] bg-yellow-300 my-2 p-2 md:my-2 flex rounded-br-[25px] rounded-l-[25px]'
            }
          >
            <div className="flex justify-between">
              <p className=" text-[rgba(0,0,0,0.76)] text-[14px] relative">
                <div className="asolute">{message.text}</div>
                <div className="ml-7 px-2 text-[11px] text-end mb-auto rounded text-black font-light">
                  {message.createdAt.split('T')[1].split('.')[0]}
                </div>
              </p>
            </div>
          </div>
        )}
        {!message?.text && message?.images?.length > 0 && (
          <div
            className={
              owner
                ? 'max-w-[250px] bg-[#8ba1ee] my-2 md:my-2 p-2 md:p-1 flex  rounded-[7px]'
                : 'max-w-[250px] bg-yellow-300 my-2 p-2 md:p-1 md:my-2 flex rounded-[7px]'
            }
          >
            <div>
              <p className=" text-[rgba(0,0,0,0.76)] text-[14px] ">
                {message.text}
                <div className="relative">
                  {message.images.map((img) => (
                    <img
                      src={img}
                      alt="images sender"
                      className="h-[200px] w-[200px] object-cover rounded-[3px]"
                      key={img._id}
                    />
                  ))}
                  <div className="absolute right-0 bottom-0 gradiant py-1 px-2 text-[11px] rounded text-white">
                    {message.createdAt.split('T')[1].split('.')[0]}
                  </div>
                </div>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Message
