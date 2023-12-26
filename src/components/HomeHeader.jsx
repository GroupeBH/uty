import { useNavigate } from 'react-router-dom'

import AccueilPhoto from '../assets/backheader.png'

function HomeHeader() {
  const navigate = useNavigate()

  const seller = localStorage.getItem('seller')
  const currentUser = localStorage.getItem('currentUser')

  const handleCommand = () => {
    if (!currentUser && !seller) {
      navigate('/sign-in')
    } else if (seller) {
      navigate('/Account/announcements')
    } else {
      navigate('/Account/announcements')
    }
  }

  return (
    <div className="">
      <div className="px-[16px] md:px-16 grid items-center pt-14 md:pt-10 md:grid-cols-2 bg-[#f5f5f5] h-[100vh] md:h-[100vh]">
        <div className=" w-[100%] md:w-[50]">
          <div className="text-[24px] md:text-[30px] mb-3 font-poppins text-[#353434] leading-9">
            <strong className="text-primary font-extrabold">Commandez</strong>{' '}
            depuis chez vous avec{' '}
            <strong className="text-secondary font-extrabold">
              u<strong className="text-primary font-extrabold">t</strong>y
            </strong>{' '}
            et recevez vos achats.
          </div>
          <div className="text-[#0c0c0c] text-sm leading-7 mb-3 tracking-wide">
            Rejoignez Uty aujourd’hui et découvrez le meilleur de ce que votre
            communauté a à offrir. Ensemble, nous pouvons renforcer notre
            économie locale, une transaction à la fois. Bienvenue dans le futur
            du commerce électronique local
          </div>
          <div className="flex gap-2">
            <div
              className="w-[50%] md:w-[35%] px-0 bg-secondary text-center md:inline-block font-normal cursor-pointer text-primary text-[15px] mt-4 md:px-12 py-[10px] md:py-[7px] hover:rounded-[20px] rounded-[2px] transition-all delay-200 ease-in-out"
              onClick={() => navigate('/categories')}
            >
              Commandez
            </div>
            <div
              className="w-[50%] md:w-[35%] px-0 bg-primary text-center md:inline-block font-normal cursor-pointer text-secondary text-[15px] mt-4 md:px-16 py-[10px] md:py-[7px] hover:rounded-[20px] rounded-[2px] transition-all delay-200 ease-in-out"
              onClick={handleCommand}
            >
              Vendez
            </div>
          </div>
        </div>
        <div className=" hidden md:block md:w-[50] ">
          <img
            src={AccueilPhoto}
            alt=""
            className="hidden md:w-[70%] md:block md:ml-auto"
          />
        </div>
      </div>
    </div>
  )
}

export default HomeHeader

// const containerRef = useRef(null)
// const [announceProvider, setAnnounceProvider] = useState()
// const [loader, setLoader] = useState(false)

/*
  useEffect(() => {
    axios
      .get('https://uty-ti30.onrender.com/api/provider/get-sellers')
      .then((response) => {
        setAnnounceProvider(response.data)
        setTimeout(() => {
          setLoader(true)
        }, 1000)
      })
      .catch((error) => {
        console.log(error)
      })
  }, [])
  */

// const limiText = 'w-12 text-ellipsis overflow-hidden whitespace-nowrap'
// #efefef

/* Commandez depuis chez vous avec{' '}
            <strong className="text-primary">UTY</strong> et recevez vos achats
            directement a votre porte.
  */

/*
<div className="flex justify-center items-center px-[10px]  h-[100vh] w-[100%] bg-center bg-no-repeat bg-cover :bg-center :bg-no-repeat :bg-cover  md:flex-none md:p-16 md:h-[100vh] dasableImage">
      <div className="flex justify-between flex-col w-[100%] pt-20">
        {loader ? (
          <div className="relative z-10">
            <div className="flex">
              <div
                id="slider"
                ref={containerRef}
                className="flex w-full justify-between h-full overflow-x-auto text-ellipsis overflow-hidden whitespace-nowrap"
              >
                <div className="absolute top-6 left-0 z-20 sm:top-9 text-[20px] rounded-full hover:bg-[#dfd9d9] transition ease-in-out delay-150 bg-[#ffffff]">
                  <ScrollRight containerRef={containerRef} />
                </div>
                <AnnounceUser data={announceProvider} loader={loader} />
                <div className="absolute top-6 right-0 z-20 sm:top-9 text-[20px] rounded-full hover:bg-[#dfd9d9] transition ease-in-out delay-150 bg-[#ffffff] ">
                  <ScrollLeft containerRef={containerRef} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            <div className="loading-spinner"></div>
            <div className="loading-spinner"></div>
            <div className="loading-spinner"></div>
            <div className="loading-spinner"></div>
            <div className="loading-spinner"></div>
            <div className="loading-spinner"></div>
          </div>
        )} 
        </div>
        </div>
        */
