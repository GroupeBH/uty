import React from 'react'
import Image from '../../assets/chaussures.jpg'

function Categories2() {
  const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  return (
    <div className="px-5 py-6 md:p-16 flex flex-col">
      {list.map((listItem) => (
        <div key={listItem.id} className="pb-8">
          <h2 className="text-title text-black font-bold border-1 rounded-[5px] px-3 mb-2">
            Categorie
          </h2>
          <div>
            <div className="text-[rgba(31,29,29,0.87)] text-[15px]">
              <span className="pr-2">
                {'Pas de description pour cette categorie'}
              </span>
              |<span className="pl-2 font-bold">123 Annonces</span>
            </div>
            <div className="grid gap-4 overflow-x-scroll grid-flow-col pt-3 md:gap-4 py-3">
              {list.map((listItem) => (
                <div
                  key={listItem}
                  className="flex w-[250px] flex-col rounded-[10px] border-[1px] shadow-[0_0_0px_rgba(20,_20,_20,_0.2)] shadow-[0_0_0_rgba(48, 48, 49, 0.3)] hover:shadow-[0_0_15px_rgba(20,_20,_20,_0.2)] transition-all ease-in-out delay-150"
                >
                  <div className="h-[150px] w-[100%] rounded-[10px] md:h-[195px]">
                    <img
                      className="h-[150px] w-[100%] rounded-t-[10px] object-cover object-center md:h-[195px]"
                      src={Image}
                      alt=""
                    />
                  </div>
                  <div className="px-3 pb-3">
                    <div className="pt-5 pb-4 text-[12px]">
                      {'Pas de description pour cette annonce'}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[rgba(0,0,0,0.65)] text-[15px]">
                        <div className="font-semibold text-[13px]">1200</div>
                      </div>
                      <span className="bg-primary text-[11px] px-4 py-[5px] text-[#ffffe8] font-medium rounded-[5px]">
                        Détail
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Categories2
