import React, { useEffect, useState } from 'react'
import { getProposals } from '../../services/Orders/get-proposals'
import defaultImg from '../../assets/default.png'
// import { useNavigate } from 'react-router-dom'
import _ from 'lodash'
import { NumericFormat } from 'react-number-format'

export default function ProposalList() {
  const seller = JSON.parse(localStorage.getItem('seller'))

  const [proposals, setProposals] = useState([])
  //   const navigate = useNavigate()

  useEffect(() => {
    getProposals(seller, setProposals)
  }, [])
  return (
    <div className="mt-10 p-5">
      <div className="mb-5">
        <h3 className="font-poppins text-gray-1000 text-xl">
          Les propositions envoyés
        </h3>
        <p className="text-sm text-gray-700">
          Elargissez votre champs d{"'"}action en vendant au delà de vos
          annonces{' '}
        </p>
      </div>
      <div className="w-[100%] grid grid-cols-2 md:grid-cols-5 gap-3">
        {proposals?.map((proposal) => {
          return (
            <div
              key={proposal?._id}
              className="md:w-[12vw] border border-[rgba(69,147,224,0.34)] bg-white rounded-[0.25rem]"
            >
              <div className="w-[100%]">
                <img
                  src={
                    _.isEmpty(proposal?.medias[0])
                      ? defaultImg
                      : proposal?.medias[0]
                  }
                  className="w-[100%] h-[20vh]"
                  alt=""
                />
              </div>
              <div className="p-2 font-roboto">
                <div>
                  <p className="text-sm">Description</p>
                  <span className="text-sm text-gray-800">
                    {proposal?.description}
                  </span>
                </div>
                <div>
                  <span className="font-poppins text-gray-800">
                    <NumericFormat
                      value={proposal?.price}
                      displayType={'text'}
                      thousandSeparator=" "
                    />{' '}
                    fc
                  </span>
                  <p className="text-sm">status--{proposal?.status}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
