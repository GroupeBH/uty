import React from 'react'
import {
  FaInstagram,
  FaFacebookSquare,
  FaLinkedin,
  FaYoutube,
  FaSnapchatSquare,
  FaTiktok,
} from 'react-icons/fa'

import Xlogo from '../assets/X.png'

function Medias() {
  return (
    <div className="flex justify-between">
      <a
        className="ml-6 hover:text-secondary"
        href="https://instagram.com/uty_app?utm_source=qr&igshid=MzNlNGNkZWQ4Mg%3D%3D"
        target="_blank"
        rel="noreferrer"
      >
        <FaInstagram />
      </a>
      <a
        className="ml-4 hover:text-secondary"
        href="https://www.facebook.com/profile.php?id=100085612274815&mibextid=b06tZ0"
        target="_blank"
        rel="noreferrer"
      >
        <FaFacebookSquare />
      </a>
      <a
        className="ml-4 hover:text-secondary"
        href="https://www.linkedin.com/company/uty-inc/"
        target="_blank"
        rel="noreferrer"
      >
        <FaLinkedin />
      </a>
      <a
        className="ml-4 hover:text-secondary"
        href="https://www.youtube.com/channel/UCxKPXRVv0zRteRZL8MHpGzg"
        target="_blank"
        rel="noreferrer"
      >
        <FaYoutube />
      </a>
      <a
        className="ml-4 hover:text-secondary"
        href="https://www.tiktok.com/@uty_app?_t=8efInH1WWgg&_r=1"
        target="_blank"
        rel="noreferrer"
      >
        <FaTiktok />
      </a>
      <a
        className="ml-4 hover:text-secondary"
        href="https://www.snapchat.com/add/uty_app?share_id=MzaitXbnbrY&locale=fr-FR"
        target="_blank"
        rel="noreferrer"
      >
        <FaSnapchatSquare />
      </a>
      <a
        className="ml-4 hover:text-secondary"
        href=" https://x.com/UtyApp?t=9xPP-8A_4r44O2Bu5pr_Pw&s=08"
        target="_blank"
        rel="noreferrer"
      >
        <img className="bg-white rounded-sm h-[3vh]" src={Xlogo} alt="" />
      </a>
    </div>
  )
}

export default Medias
