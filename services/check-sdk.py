from ostium_python_sdk import OstiumSDK

sdk = OstiumSDK(
    network='testnet',
    private_key='0xa72ec44934835f3f5d76a9957800d3a727b2fa2f634f6fcc6c58602c0621deef',
    rpc_url='https://sepolia-rollup.arbitrum.io/rpc'
)

print('SDK attributes:')
attrs = [x for x in dir(sdk) if not x.startswith('_')]
for attr in attrs:
    print(f'  - {attr}')
    obj = getattr(sdk, attr)
    if hasattr(obj, '__dict__') and not callable(obj):
        sub_attrs = [x for x in dir(obj) if not x.startswith('_')]
        for sub in sub_attrs[:5]:  # Just show first 5
            print(f'      - {sub}')

