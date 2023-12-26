import React from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import utyLogo from '../assets/logo-uty.png'

function Modal({ setIsOpen }) {
  const navigate = useNavigate()
  const handleClick = () => {
    setIsOpen(false)
    navigate('/Categories')
  }
  return (
    <Container>
      <div className="modal__back">
        <div className="centered">
          <div className="modal__body">
            <img src={utyLogo} />
            <p>Merci d utiliser uty Votre demande est en traitement</p>
            <button onClick={() => handleClick()}>Ok</button>
          </div>
        </div>
      </div>
    </Container>
  )
}

const Container = styled.div`
  .modal__back {
    background-color: rgba(0, 0, 0, 0.5);
    top: 100vh;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    transform: translate(-0%, -100%);
    position: absolute;
    margin-left: -5vw;
    display: flex;
    justify-content: center;
    align-items: center;
    .centered {
      background-color: white;
      padding-right: 1vw;
      padding-left: 2vw;
      text-align: center;
      margin-right: 5vw;
      margin-left: 5vw;
      border-radius: 1rem;
      padding-bottom: 2.5vh;
      .modal__body {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10;
        img {
          height: 17.5vh;
          margin-top: 2.5vh;
        }
        p {
          font-size: 120%;
          font-weight: bold;
          color: #4f4b4b;
        }
        button {
          color: white;
          background-color: #020664;
          border: none;
          width: 80vw;
          height: 7.5vh;
          border-radius: 0.5rem;
          font-size: 120%;
          font-weight: bold;
        }
      }
    }
  }
`

export default Modal
