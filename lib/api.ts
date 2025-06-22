import { z } from 'zod'
import { User } from './generated/prisma'
import { schemaProgram } from './schema'

const createURL = (path: string) => {
  return window.location.origin + path
}

export const updateUser = async (id: string, userData: User) => {
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

export const createProgramOnBoarding = async (
  userId: string,
  onBoardingProg: z.infer<typeof schemaProgram>
) => {
  const res = await fetch(new Request(createURL('/api/program')), {
    method: 'POST',
    body: JSON.stringify({ onBoardingProg, userId }),
  })
  if (res.ok) {
    console.log('Program unboarding created', res)
    const data = await res.json()
    console.log('Data', data)
    return data.user
  } else {
    const data = await res.json()
    console.log(data)
  }
}
