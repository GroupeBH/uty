import React from 'react'

function NoChat() {
  return (
    <div className="h-[70vh] flex flex-col justify-center items-center px-3">
      <div className="text-[23px] text-primary">
        Aucune discussion selectionnée.
      </div>
      <div className="text-center pt-4 text-[rgba(0,0,0,0.76)]">
        Pour pouvoir ouvrir une discussion, vous devez cliquer sur un client.
      </div>
    </div>
  )
}

export default NoChat
