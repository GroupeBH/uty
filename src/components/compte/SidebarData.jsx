import React from 'react'
import { IoPerson, IoMailOpenOutline } from 'react-icons/io5'
import {
  BsMegaphone,
  BsCollection,
  BsBasket3,
  BsCartPlus,
  BsPersonGear,
} from 'react-icons/bs'

export const SidebarSeller = [
  {
    title: 'Annonces',
    path: '/Account/announcements',
    icon: <BsMegaphone />,
  },
  {
    title: 'Nouvelles commandes',
    path: '/Account/products-wanted',
    icon: <BsCartPlus />,
  },
  {
    title: 'Propositions',
    path: '/Account/propositions',
    icon: <BsCollection />,
  },
]

export const SidebarData = [
  {
    title: 'Mon profil',
    path: '/Account/profile',
    icon: <BsPersonGear />,
  },
  {
    title: 'Devenir vendeur',
    path: '/Account/seller',
    icon: <IoPerson />,
  },
  {
    title: 'Offres reçus',
    path: '/Account/offers',
    icon: <BsBasket3 />,
  },

  {
    title: 'Conversation',
    path: '/Account/chat',
    icon: <IoMailOpenOutline />,
  },
]
