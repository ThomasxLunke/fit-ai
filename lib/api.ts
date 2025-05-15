import { User } from './generated/prisma'

const createURL = (path: string) => {
  return window.location.origin + path
}

export const updateUser = async (id: string, userData: User) => {
  console.log(userData)
  const res = await fetch(
    new Request(createURL(`/api/user/${id}`), {
      method: 'PATCH',
      body: JSON.stringify({ userData }),
    })
  )

  if (res.ok) {
    console.log('User updated', res)
    const data = await res.json()
    console.log('Data', data)
    return data.user
  }
}
