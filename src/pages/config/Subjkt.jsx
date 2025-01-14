/* eslint-disable react-hooks/exhaustive-deps */
import get from 'lodash/get'
import { useContext, useEffect, useState } from 'react'
import { Page } from '@atoms/layout'
import { Input } from '@atoms/input'
import { Button } from '@atoms/button'
import { Identicon } from '@atoms/identicons'
import { fetchGraphQL } from '@data/api'
import { uploadFileToIPFSProxy } from '@data/ipfs'
import { TeiaContext } from '@context/TeiaContext'
import _ from 'lodash'
import styles from '@style'
import { Line } from '@atoms/line'
import { Buffer } from 'buffer'

const query_tz = `
query addressQuery($address: String!) {
  teia_users(where: { user_address: {_eq: $address}}) {
    user_address
    name
    metadata {
      data
    }
  }
}
`

const query_name_exist = `
query nameExists($name: String!) {
  teia_users(where: { name: {_eq: $name}}) {
    user_address
  }
}
`

async function fetchTz(address) {
  const { errors, data } = await fetchGraphQL(query_tz, 'addressQuery', {
    address,
  })
  if (errors) {
    console.error(errors)
  }

  return get(data, 'teia_users.0', { user_address: address })
}

export const Subjkt = () => {
  const context = useContext(TeiaContext)
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState('')
  const [subjkt, setSubjkt] = useState('')
  const [description, setDescription] = useState('')
  const [identicon, setIdenticon] = useState('')
  const [selectedFile, setSelectedFile] = useState('')

  useEffect(() => {
    const init = async () => {
      const { address, proxyAddress } = context

      // Maybe use proxy address here
      const cur_address = proxyAddress || address
      if (cur_address) {
        setAddress(cur_address)
        const res = await fetchTz(cur_address)
        context.setSubjktInfo(res)
        console.debug('Subjkt Infos:', res)

        if (res) {
          let { metadata, name } = res

          if (name) setSubjkt(name)

          if (metadata && !_.isEmpty(metadata?.data)) {
            if (metadata?.data?.description)
              setDescription(metadata.data.description)
            if (metadata?.data?.identicon) setIdenticon(metadata.data.identicon)
          }
        }
      }
      setLoading(false)
    }
    init().catch(console.error)
  }, [])

  const name_exists = async () => {
    if (!subjkt) return false

    const { errors, data } = await fetchGraphQL(
      query_name_exist,
      'nameExists',
      {
        name: subjkt,
      }
    )
    if (errors) {
      console.error(errors)
      return false
    }

    if (data.teia_users.length === 0) return false

    const holder = data.teia_users[0]

    if (holder.user_address === address) return false

    console.error(`name exists and is registered to ${holder.user_address}`)

    context.setFeedback({
      visible: true,
      message: `The provided name is already registered by ${holder.user_address}`,
      progress: false,
      confirm: true,
      confirmCallback: () => {
        context.setFeedback({ visible: false })
      },
    })

    return true
  }

  // upload to profile pic + subjkt meta to IPFS & call the SUBJKT registry
  const subjkt_config = async () => {
    if (await name_exists()) {
      return
    }

    context.setFeedback({
      visible: true,
      message: 'uploading SUBJKT',
      progress: true,
      confirm: false,
    })

    if (selectedFile) {
      const [file] = selectedFile

      context.setFeedback({
        message: 'uploading indenticon',
      })

      const buffer = Buffer.from(await file.arrayBuffer())
      const picture_cid = await uploadFileToIPFSProxy({
        blob: new Blob([buffer]),
        path: file.name,
      })
      setIdenticon(`ipfs://${picture_cid}`)
    }
    const meta = JSON.stringify({
      description,
      identicon,
    })
    context.setFeedback({
      message: 'uploading metadatas',
    })

    console.debug('Uploading metadatas file to IPFS', JSON.parse(meta))

    const subjkt_meta_cid = await uploadFileToIPFSProxy({
      blob: new Blob([Buffer.from(meta)]),
      path: 'profile_metadata.json',
    })

    if (subjkt_meta_cid == null) {
      context.setFeedback({
        confirm: true,
        message: 'Error uploading metadatas',
        confirmCallback: () => {
          context.setFeedback({ visible: false })
        },
      })
      console.error('Error uploading metadatas file to IPFS')
      return
    }
    console.debug('Uploaded metadatas file to IPFS', subjkt_meta_cid)

    context.setFeedback({
      message: 'minting SUBJKT',
      progress: true,
      confirm: false,
    })

    await context.registry(subjkt, subjkt_meta_cid)

    context.setFeedback({
      message: 'SUBJKT Minted',
      progress: false,
      confirm: true,
      confirmCallback: () => {
        context.setFeedback({ visible: false })
      },
    })
  }

  // upload file

  const onFileChange = async (event) => {
    setSelectedFile(event.target.files)
    //const file_title = event.target.files[0].name

    const [file] = event.target.files

    const buffer = Buffer.from(await file.arrayBuffer())
    const picture_cid = await uploadFileToIPFSProxy({
      blob: new Blob([buffer]),
      path: file.name,
    })
    setIdenticon(`ipfs://${picture_cid}`)
  }

  // const unregister = () => context.unregister()

  // const toggle = () => setToggled(!toggled)
  /*

   signature studies

   const bytes =
         '05' +
         char2Bytes(
           JSON.stringify({
             alias: this.state.alias,
             description: this.state.description,
           })
         )
       console.log(bytes)
       const payload = {
         signingType: SigningType.MICHELINE,
         payload: bytes,
         sourceAddress: this.context.addr,
       }
       console.log(payload)
       this.context.sign(payload)

  */

  // const sign = () => {
  //   context.signStr({
  //     /*       payload : "05" + char2Bytes(this.state.str) */
  //     payload: str
  //       .split('')
  //       .reduce(
  //         (hex, c) => (hex += c.charCodeAt(0).toString(16).padStart(2, '0')),
  //         ''
  //       ),
  //     /*         sourceAddress: this.context.addr,
  //      */
  //   })
  // }

  // delete account

  return (
    !loading && (
      <Page>
        <h1>Subjkt Settings</h1>
        <Line className={styles.title_line} />
        <div className={styles.subjkt_editor}>
          <div className={styles.fields}>
            <Identicon address={address} logo={identicon} />
            <input type="file" onChange={onFileChange} title="avatar file" />
          </div>
          <div className={styles.fields}>
            <Input
              name="subjkt"
              value={subjkt}
              onChange={setSubjkt}
              onBlur={(e) => {
                setSubjkt(e.target.value.replace(/[^a-z0-9-._]/g, ''))
              }}
              placeholder="can contain letters (a-z), numbers (0-9), . (dot), - (dash), _ (underscore)"
              label="Username"
              pattern="^[a-z0-9-._]*$"
            />
            <Input
              name="description"
              value={description}
              onChange={setDescription}
              placeholder="(Max length 500 characters)"
              label="Description"
            />
          </div>
        </div>
        <Button shadow_box onClick={subjkt_config}>
          Save Profile
        </Button>
        <div style={{ display: 'inline' }}>
          <p style={{ paddingTop: '7.5px' }}>
            <span>Link your Twitter, Discord, GitHub, and website with </span>
            <span>
              <a
                style={{ fontWeight: 'bold' }}
                target="_blank"
                href="https://tzprofiles.com"
                rel="noreferrer"
              >
                Tezos Profiles
              </a>
            </span>
          </p>
        </div>
      </Page>
    )
  )
}
