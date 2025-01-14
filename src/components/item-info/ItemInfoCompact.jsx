import { Button } from '@atoms/button'
import { walletPreview } from '@utils/string'
import { isNumber } from 'lodash'
import styles from '@style'
import Editions from './Editions'
import useLocalSettings from '@hooks/use-local-settings'
import { TezosIcon } from '@icons'
import { PATH } from '@constants'
import { useParams } from 'react-router'

const Price = ({ price }) => (
  <div className={styles.price_box}>
    {price}
    <TezosIcon size={16} />
  </div>
)
/**
 * @param {Object} itemInfoCompactOptions
 * @param {import("@types").NFT} itemInfoCompactOptions.nft
 **/
const ItemInfoCompact = ({ nft }) => {
  const { zen, viewMode } = useLocalSettings()

  const param = useParams()

  const _price = !zen
    ? isNumber(nft.price)
      ? (Number(nft.price) / 1e6).toString()
      : 'X'
    : null

  return (
    <div className={`${styles.compact_container} ${styles.masonry}`}>
      {(viewMode === 'single' || (param['id'] && param['*'] === '')) && (
        <Button
          alt={`Go to OBJKT ${nft.token_id}`}
          to={`${PATH.OBJKT}/${nft.token_id}`}
        >
          #{nft.token_id}
        </Button>
      )}
      <Button
        className={styles.artist}
        activeClass={styles.hide}
        alt={`Go to artist page of token #${nft.token_id}`}
        to={
          nft.artist_profile?.name
            ? `/${nft.artist_profile.name}`
            : `/tz/${nft.artist_address}`
        }
      >
        {nft.artist_profile?.name
          ? nft.artist_profile.name
          : walletPreview(nft.artist_address)}
      </Button>
      <Editions className={styles.editions} nft={nft} />
      <Price price={_price} />
    </div>
  )
}

export default ItemInfoCompact
